import { prisma } from '../../database/prisma'
import { applyMemoryCommand, type MemoryAction, readMemoryMap } from './agent-memory'

/// Per-org memory store backing the Anthropic memory tool. Each command is a
/// read-modify-write on `Organization.metadata.memory`. Two concurrency hazards
/// to defend against (Prisma's default isolation is Read Committed, which does
/// NOT prevent lost updates on a RMW):
///   1. parallel memory tool calls in one agent step, and
///   2. a Settings profile save touching the same `metadata` column.
/// We take a row lock (`SELECT … FOR UPDATE`) so RMWs serialise, and write via
/// `jsonb_set` on the `{memory}` subkey only, so a concurrent `{profile}` write
/// is never clobbered. `updateProfile` mirrors this with `{profile}`.
export async function handleMemoryCommand(orgId: string, action: MemoryAction): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ metadata: unknown }>>`
      SELECT metadata FROM "organizations" WHERE id = ${orgId} FOR UPDATE
    `
    if (rows.length === 0) return `Error: organization not found.`

    const { map, result } = applyMemoryCommand(readMemoryMap(rows[0].metadata), action)
    // Persist only on a real mutation. Every error path returns an "Error: …"
    // string and leaves the map untouched, and `view` never mutates — so this
    // skips no-op writes (and narrows the lock window).
    const mutated = action.command !== 'view' && !result.startsWith('Error')
    if (mutated) {
      await tx.$executeRaw`
        UPDATE "organizations"
        SET metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{memory}', ${JSON.stringify(map)}::jsonb)
        WHERE id = ${orgId}
      `
    }
    return result
  })
}
