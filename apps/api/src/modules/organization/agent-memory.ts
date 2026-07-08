/// Pure command engine for the agent memory tool (Anthropic `memory_20250818`).
/// The model issues filesystem-style commands against a `/memories` directory;
/// we model that directory as a flat path→content map (stored per-org on
/// `Organization.metadata.memory`). Keeping the logic pure + DB-free makes the
/// path sandboxing and caps fully unit-testable; the DB read/modify/write lives
/// in `agent-memory.store.ts`.

export type MemoryMap = Record<string, string>

/// The action union mirrors `@ai-sdk/anthropic`'s memory_20250818 tool input.
export type MemoryAction =
  | { command: 'view'; path: string; view_range?: [number, number] }
  | { command: 'create'; path: string; file_text: string }
  | { command: 'str_replace'; path: string; old_str: string; new_str: string }
  | { command: 'insert'; path: string; insert_line: number; insert_text: string }
  | { command: 'delete'; path: string }
  | { command: 'rename'; old_path: string; new_path: string }

export const MEMORY_ROOT = '/memories'

// Caps keep a single org's memory bounded (it lives inside a JSON column shared
// with the business profile). Exceeding a cap returns an error string the model
// sees and can react to, rather than silently dropping data.
export const MAX_FILES = 64
export const MAX_FILE_BYTES = 16_384
export const MAX_TOTAL_BYTES = 131_072

const bytes = (s: string): number => Buffer.byteLength(s, 'utf8')

/// A path is valid iff it's the root or sits directly/nested under it, with no
/// traversal or null bytes. Anthropic scopes all memory paths to `/memories`.
function isValidPath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) return false
  if (path.includes('\0') || path.includes('..')) return false
  return path === MEMORY_ROOT || path.startsWith(`${MEMORY_ROOT}/`)
}

function isFilePath(path: string): boolean {
  // isValidPath enforces the sandbox (under /memories, no traversal / null bytes);
  // a file additionally must be nested (not the root) and not a directory.
  return isValidPath(path) && path.startsWith(`${MEMORY_ROOT}/`) && !path.endsWith('/')
}

function totalBytes(map: MemoryMap): number {
  let n = 0
  for (const [k, v] of Object.entries(map)) n += bytes(k) + bytes(v)
  return n
}

function ok(map: MemoryMap, result: string): { map: MemoryMap; result: string } {
  return { map, result }
}

/// Apply one memory command to a map. Never mutates the input; returns the new
/// map (unchanged on error) + a human/model-readable result string. Errors are
/// returned as `Error: ...` strings, not thrown — the tool surfaces them to the
/// model so it can recover.
export function applyMemoryCommand(
  input: MemoryMap,
  action: MemoryAction,
): { map: MemoryMap; result: string } {
  const map = { ...input }

  switch (action.command) {
    case 'view': {
      if (!isValidPath(action.path)) return ok(map, `Error: invalid path "${action.path}".`)
      // Directory view → list files under the prefix.
      if (action.path === MEMORY_ROOT || action.path.endsWith('/')) {
        const prefix = action.path === MEMORY_ROOT ? `${MEMORY_ROOT}/` : action.path
        const files = Object.keys(map)
          .filter((p) => p.startsWith(prefix))
          .sort()
        return ok(
          map,
          files.length === 0 ? `${action.path} is empty.` : `${action.path}:\n${files.join('\n')}`,
        )
      }
      const content = map[action.path]
      if (content === undefined) return ok(map, `Error: "${action.path}" does not exist.`)
      if (action.view_range) {
        const [from, to] = action.view_range
        const lines = content.split('\n')
        // 1-indexed, inclusive; -1 end means "to end".
        const slice = lines.slice(Math.max(0, from - 1), to === -1 ? undefined : to)
        return ok(map, slice.join('\n'))
      }
      return ok(map, content)
    }

    case 'create': {
      if (!isFilePath(action.path)) return ok(map, `Error: invalid file path "${action.path}".`)
      if (bytes(action.file_text) > MAX_FILE_BYTES)
        return ok(map, `Error: file exceeds ${MAX_FILE_BYTES} bytes.`)
      const isNew = map[action.path] === undefined
      if (isNew && Object.keys(map).length >= MAX_FILES)
        return ok(map, `Error: memory is full (${MAX_FILES} files max). Delete something first.`)
      const next = { ...map, [action.path]: action.file_text }
      if (totalBytes(next) > MAX_TOTAL_BYTES)
        return ok(
          map,
          `Error: memory is full (${MAX_TOTAL_BYTES} bytes max). Delete something first.`,
        )
      return ok(next, `${isNew ? 'Created' : 'Overwrote'} ${action.path}.`)
    }

    case 'str_replace': {
      const content = map[action.path]
      if (content === undefined) return ok(map, `Error: "${action.path}" does not exist.`)
      if (!content.includes(action.old_str))
        return ok(map, `Error: old_str not found in "${action.path}".`)
      // Anthropic text-editor semantics: refuse an ambiguous match so the model
      // can't silently edit the wrong span. It must pass a unique old_str.
      if (content.indexOf(action.old_str) !== content.lastIndexOf(action.old_str))
        return ok(map, `Error: old_str is not unique in "${action.path}" — include more context.`)
      const updated = content.replace(action.old_str, action.new_str)
      if (bytes(updated) > MAX_FILE_BYTES)
        return ok(map, `Error: file would exceed ${MAX_FILE_BYTES} bytes.`)
      const next = { ...map, [action.path]: updated }
      if (totalBytes(next) > MAX_TOTAL_BYTES)
        return ok(map, `Error: memory would exceed ${MAX_TOTAL_BYTES} bytes.`)
      return ok(next, `Edited ${action.path}.`)
    }

    case 'insert': {
      const content = map[action.path]
      if (content === undefined) return ok(map, `Error: "${action.path}" does not exist.`)
      const lines = content.split('\n')
      if (action.insert_line < 0 || action.insert_line > lines.length)
        return ok(map, `Error: insert_line ${action.insert_line} out of range (0-${lines.length}).`)
      lines.splice(action.insert_line, 0, action.insert_text)
      const updated = lines.join('\n')
      if (bytes(updated) > MAX_FILE_BYTES)
        return ok(map, `Error: file would exceed ${MAX_FILE_BYTES} bytes.`)
      const next = { ...map, [action.path]: updated }
      if (totalBytes(next) > MAX_TOTAL_BYTES)
        return ok(map, `Error: memory would exceed ${MAX_TOTAL_BYTES} bytes.`)
      return ok(next, `Inserted into ${action.path}.`)
    }

    case 'delete': {
      if (map[action.path] === undefined) return ok(map, `Error: "${action.path}" does not exist.`)
      const next = { ...map }
      delete next[action.path]
      return ok(next, `Deleted ${action.path}.`)
    }

    case 'rename': {
      if (!isFilePath(action.new_path))
        return ok(map, `Error: invalid destination "${action.new_path}".`)
      if (map[action.old_path] === undefined)
        return ok(map, `Error: "${action.old_path}" does not exist.`)
      if (map[action.new_path] !== undefined)
        return ok(map, `Error: "${action.new_path}" already exists.`)
      const next = { ...map, [action.new_path]: map[action.old_path] }
      delete next[action.old_path]
      return ok(next, `Renamed ${action.old_path} → ${action.new_path}.`)
    }

    default: {
      const _exhaustive: never = action
      void _exhaustive
      return ok(map, 'Error: unknown command.')
    }
  }
}

/// Parse the memory map out of an Organization.metadata value. Tolerant: drops
/// any non-string entries / malformed shape rather than throwing.
export function readMemoryMap(metadata: unknown): MemoryMap {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  const raw = (metadata as Record<string, unknown>).memory
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: MemoryMap = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && isValidPath(k)) out[k] = v
  }
  return out
}
