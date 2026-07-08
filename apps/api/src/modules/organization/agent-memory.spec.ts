import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyMemoryCommand, MAX_FILES, type MemoryMap, readMemoryMap } from './agent-memory'

describe('agent memory command engine', () => {
  it('creates a file under /memories', () => {
    const { map, result } = applyMemoryCommand(
      {},
      {
        command: 'create',
        path: '/memories/prefs.md',
        file_text: 'terse replies',
      },
    )
    assert.equal(map['/memories/prefs.md'], 'terse replies')
    assert.match(result, /Created/)
  })

  it('rejects a path outside /memories', () => {
    const { map, result } = applyMemoryCommand(
      {},
      {
        command: 'create',
        path: '/etc/passwd',
        file_text: 'x',
      },
    )
    assert.deepEqual(map, {})
    assert.match(result, /invalid file path/)
  })

  it('rejects path traversal', () => {
    const { result } = applyMemoryCommand(
      {},
      {
        command: 'create',
        path: '/memories/../secrets',
        file_text: 'x',
      },
    )
    assert.match(result, /invalid/)
  })

  it('views a file', () => {
    const map: MemoryMap = { '/memories/a.md': 'hello' }
    const { result } = applyMemoryCommand(map, { command: 'view', path: '/memories/a.md' })
    assert.equal(result, 'hello')
  })

  it('lists files when viewing the root directory', () => {
    const map: MemoryMap = { '/memories/a.md': '1', '/memories/b.md': '2' }
    const { result } = applyMemoryCommand(map, { command: 'view', path: '/memories' })
    assert.match(result, /\/memories\/a\.md/)
    assert.match(result, /\/memories\/b\.md/)
  })

  it('str_replace edits existing content', () => {
    const map: MemoryMap = { '/memories/a.md': 'old value' }
    const { map: next } = applyMemoryCommand(map, {
      command: 'str_replace',
      path: '/memories/a.md',
      old_str: 'old',
      new_str: 'new',
    })
    assert.equal(next['/memories/a.md'], 'new value')
  })

  it('str_replace errors when old_str is absent', () => {
    const map: MemoryMap = { '/memories/a.md': 'abc' }
    const { result } = applyMemoryCommand(map, {
      command: 'str_replace',
      path: '/memories/a.md',
      old_str: 'zzz',
      new_str: 'q',
    })
    assert.match(result, /not found/)
  })

  it('inserts a line at a position', () => {
    const map: MemoryMap = { '/memories/a.md': 'l1\nl3' }
    const { map: next } = applyMemoryCommand(map, {
      command: 'insert',
      path: '/memories/a.md',
      insert_line: 1,
      insert_text: 'l2',
    })
    assert.equal(next['/memories/a.md'], 'l1\nl2\nl3')
  })

  it('deletes a file', () => {
    const map: MemoryMap = { '/memories/a.md': 'x' }
    const { map: next } = applyMemoryCommand(map, { command: 'delete', path: '/memories/a.md' })
    assert.equal('/memories/a.md' in next, false)
  })

  it('renames a file', () => {
    const map: MemoryMap = { '/memories/a.md': 'x' }
    const { map: next } = applyMemoryCommand(map, {
      command: 'rename',
      old_path: '/memories/a.md',
      new_path: '/memories/b.md',
    })
    assert.equal(next['/memories/b.md'], 'x')
    assert.equal('/memories/a.md' in next, false)
  })

  it('enforces the max-files cap', () => {
    const map: MemoryMap = {}
    for (let i = 0; i < MAX_FILES; i++) map[`/memories/f${i}.md`] = 'x'
    const { result } = applyMemoryCommand(map, {
      command: 'create',
      path: '/memories/overflow.md',
      file_text: 'x',
    })
    assert.match(result, /full/)
  })

  it('does not mutate the input map', () => {
    const map: MemoryMap = { '/memories/a.md': 'x' }
    applyMemoryCommand(map, { command: 'delete', path: '/memories/a.md' })
    assert.equal(map['/memories/a.md'], 'x')
  })
})

describe('readMemoryMap', () => {
  it('returns empty for null metadata', () => {
    assert.deepEqual(readMemoryMap(null), {})
  })

  it('drops non-string and out-of-sandbox entries', () => {
    const map = readMemoryMap({
      memory: { '/memories/ok.md': 'keep', '/memories/bad.md': 42, '/evil': 'drop' },
    })
    assert.deepEqual(map, { '/memories/ok.md': 'keep' })
  })
})
