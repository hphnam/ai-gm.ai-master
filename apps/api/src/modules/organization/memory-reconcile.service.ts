import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { Injectable, Logger } from '@nestjs/common'
import { generateObject } from 'ai'
import { z } from 'zod'
import { prisma } from '../../database/prisma'
import { readMemoryMap } from './agent-memory'
import { handleMemoryCommand } from './agent-memory.store'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// Bound the Haiku context: enough KB to judge contradictions, not the whole corpus.
const KB_SNAPSHOT_LIMIT = 60
const KB_SUMMARY_CHARS = 200

const MAX_STALE = 64

const StaleSchema = z.object({
  // Paths the model judges contradicted by, or fully superseded by, the current
  // KB. Conservative by instruction — preferences with no KB equivalent stay.
  stalePaths: z.array(z.string()).max(MAX_STALE),
})

/// Conservative reconciliation of an org's agent memory against its knowledge
/// base. The KB is authoritative; this prunes memory notes the KB now
/// contradicts or fully covers. Preferences/facts with no KB equivalent are
/// kept. Pure answer-correctness is already guaranteed at read time (KB wins) —
/// this only keeps the memory store lean and self-consistent.
@Injectable()
export class MemoryReconcileService {
  private readonly logger = new Logger(MemoryReconcileService.name)

  async reconcileOrg(orgId: string): Promise<{ pruned: number }> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { metadata: true },
    })
    const memory = readMemoryMap(org?.metadata)
    const paths = Object.keys(memory)
    if (paths.length === 0) return { pruned: 0 }

    // Escape hatch: skip the Haiku call (keeps the cron schedulable while the
    // generator is off, mirroring CHAT_STARTERS_GENERATOR_DISABLED).
    if (process.env.MEMORY_RECONCILE_GENERATOR_DISABLED === '1') return { pruned: 0 }

    const kb = await this.buildKbSnapshot(orgId)
    if (kb.length === 0) return { pruned: 0 } // nothing authoritative to contradict against

    const stale = await this.askWhatIsStale(memory, kb)
    const toDelete = selectStalePaths(memory, stale)
    for (const path of toDelete) {
      await handleMemoryCommand(orgId, { command: 'delete', path })
    }
    if (toDelete.length > 0) {
      this.logger.log(
        JSON.stringify({ event: 'memory_reconcile.pruned', orgId, count: toDelete.length }),
      )
    }
    return { pruned: toDelete.length }
  }

  private async buildKbSnapshot(orgId: string): Promise<string[]> {
    const rows = await prisma.knowledgeItem.findMany({
      where: { organizationId: orgId, supersededAt: null },
      select: { metadata: true, aiSummary: true, content: true },
      orderBy: { updatedAt: 'desc' },
      take: KB_SNAPSHOT_LIMIT,
    })
    return rows.map((r) => {
      const meta = (r.metadata ?? {}) as { title?: unknown }
      const title =
        typeof meta.title === 'string' && meta.title.trim().length > 0 ? meta.title.trim() : 'doc'
      const summary = (r.aiSummary ?? r.content ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, KB_SUMMARY_CHARS)
      return `- ${title}: ${summary}`
    })
  }

  private async askWhatIsStale(memory: Record<string, string>, kb: string[]): Promise<string[]> {
    const memoryBlock = Object.entries(memory)
      .map(([path, content]) => `${path}:\n${content}`)
      .join('\n\n')
    const prompt = `You keep an AI assistant's private memory consistent with the authoritative knowledge base (KB) of a business. The KB always wins.

KB (authoritative, current):
${kb.join('\n')}

MEMORY NOTES (path then content):
${memoryBlock}

Return the paths of memory notes that are now CONTRADICTED by the KB, or FULLY and redundantly covered by it. Be conservative: keep any note that records a preference, a fact the KB does not cover, or anything ambiguous. Only list a path when removing it clearly loses nothing or fixes a contradiction.`

    try {
      const { object } = await generateObject({
        model: anthropicProvider(HAIKU_MODEL),
        schema: StaleSchema,
        messages: [{ role: 'user', content: prompt }],
        maxRetries: 1,
      })
      return object.stalePaths
    } catch (err) {
      // Best-effort: a failed reconcile never deletes anything.
      this.logger.warn(
        JSON.stringify({
          event: 'memory_reconcile.generate_failed',
          message: (err as Error).message,
        }),
      )
      return []
    }
  }
}

/// Intersect the model's stale-path list with paths that actually exist in the
/// map — the model can hallucinate a path, and we must never act on one that
/// isn't real. Pure + unit-tested.
export function selectStalePaths(memory: Record<string, string>, stalePaths: string[]): string[] {
  return stalePaths.filter((p) => Object.hasOwn(memory, p))
}
