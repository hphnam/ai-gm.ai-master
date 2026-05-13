import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { prisma } from '../../database/prisma'

export type QuoteVerifyIssue = {
  claim: string
  problem: string
  expected: string | null
}

export type QuoteVerifyResult =
  | { ok: true; checked: number }
  | { ok: false; checked: number; issues: QuoteVerifyIssue[] }

const CALL_TIMEOUT_MS = 6000
const MAX_SOURCE_CHARS = 6000

/// Phase E2 — server-side fidelity check. Compares an agent draft against the
/// source content of cited knowledge_items via Claude Haiku, flagging
/// misquoted brand names, numbers, error codes, phone numbers, etc.
@Injectable()
export class QuoteVerifierService implements OnModuleInit {
  private readonly logger = new Logger(QuoteVerifierService.name)
  private client!: Anthropic

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.client = new Anthropic({ apiKey })
  }

  async verify(draft: string, sourceIds: string[], orgId: string): Promise<QuoteVerifyResult> {
    const sources = await prisma.knowledgeItem.findMany({
      where: { id: { in: sourceIds }, organizationId: orgId },
      select: { id: true, content: true, aiSummary: true, metadata: true },
    })

    if (sources.length === 0) {
      // Nothing to verify against — soft-pass; the agent shouldn't have
      // claimed a knowledge_item source if none were retrieved.
      return { ok: true, checked: 0 }
    }

    const sourceBlock = sources
      .map((s, i) => `[Source ${i + 1} | id=${s.id}]\n${s.content.slice(0, MAX_SOURCE_CHARS)}`)
      .join('\n\n---\n\n')

    const prompt = `You audit AI-drafted answers for hospitality staff against retrieved source documents. Check the DRAFT against each SOURCE for FIDELITY.

Specifically flag:
  • Misquoted brand / supplier / product names (e.g. draft says "Coke" but source says "Pepsi").
  • Wrong quantities or numbers (par levels, step counts, lead times, phone numbers, error codes).
  • Inverted instructions (draft says "do X first" but source says "do X last").
  • Hallucinated specifics (draft cites a value that isn't in any source).

DO NOT flag:
  • Paraphrasing or compression of source language.
  • Tone / phrasing differences.
  • Reasonable rephrasings of the user-asked question.
  • The draft adding generic safety hedges ("verify with the bottle label").

Return STRICT JSON: {"issues":[{"claim":"<exact substring from draft>","problem":"<one sentence>","expected":"<the correct value from a source, or null>"}]}. Empty array if no issues. No commentary, no markdown fences.

DRAFT:
${draft}

SOURCES:
${sourceBlock}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
    try {
      const response = await this.client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: controller.signal },
      )
      const raw = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('')
      const stripped = raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim()
      const parsed = JSON.parse(stripped) as { issues?: unknown }
      const issues = Array.isArray(parsed.issues) ? parsed.issues : []
      const cleaned: QuoteVerifyIssue[] = issues
        .filter(
          (i): i is { claim: string; problem: string; expected: unknown } =>
            !!i &&
            typeof i === 'object' &&
            typeof (i as Record<string, unknown>).claim === 'string' &&
            typeof (i as Record<string, unknown>).problem === 'string',
        )
        .map((i) => ({
          claim: i.claim,
          problem: i.problem,
          expected: typeof i.expected === 'string' ? i.expected : null,
        }))
        .slice(0, 6)

      this.logger.log(
        JSON.stringify({
          event: 'quote_verifier.run',
          orgId,
          sources: sources.length,
          issuesFound: cleaned.length,
        }),
      )

      if (cleaned.length === 0) return { ok: true, checked: sources.length }
      return { ok: false, checked: sources.length, issues: cleaned }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'quote_verifier.failed',
          orgId,
          message: (err as Error).message,
        }),
      )
      // Fail open: better to ship a possibly-imperfect reply than block the user.
      return { ok: true, checked: sources.length }
    } finally {
      clearTimeout(timer)
    }
  }
}
