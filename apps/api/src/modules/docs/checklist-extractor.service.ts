// Plan 04-03 Task 2 — procedural doc shape extractor (Claude-based).
// Source: https://docs.anthropic.com/en/api/messages · verified 2026-04-21
// Source: https://docs.anthropic.com/en/docs/about-claude/pricing.md · verified 2026-04-21
//   (Sonnet 4.6 pricing: $3/MTok input, $15/MTok output — matches classifier + image-extractor)
// Source: apps/api/src/modules/docs/extractors/image-extractor.ts:34-78 (semaphore pattern — audit-M2)
// Source: apps/api/src/common/sanitise-error.ts (audit-M2 shared util)
//
// Runs AFTER IngestService.ingest for KnowledgeItems whose DocumentType.kind === 'procedural'.
// Fail-soft by contract: ANY failure → no Checklist row, KI stays persisted, operator-diagnostic log.
//
// audit-M1 boundary: logger payloads carry tokens/USD/duration/counts/ids ONLY.
//   NEVER: step text, schedule rawText, audience rawText, document content, base64, API key.

import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { z } from 'zod'
import { sanitiseError } from '../../common/sanitise-error'
import { prisma } from '../../database/prisma'
import {
  type Audience,
  AudienceSchema,
  ChecklistDto,
  type ChecklistStep,
  ChecklistStepSchema,
  type Schedule,
  ScheduleSchema,
} from '../../types'
import { IndexerService } from '../indexer/indexer.service'

const EXTRACTOR_MAX_CONTENT_CHARS = 30_000
const EXTRACTOR_MAX_TOKENS = 2048

// Sonnet 4.6 pricing (MTok). Duplicated (not imported) to keep modules independent.
const INPUT_USD_PER_MTOK = 3
const OUTPUT_USD_PER_MTOK = 15

// Plan 04-03 audit M1/M2/S2/S4 — runtime safety bounds.
const EXTRACTOR_CALL_TIMEOUT_MS = 30_000
const MAX_CONCURRENT_CHECKLIST_EXTRACTS = 3
const EXTRACTOR_QUEUE_TIMEOUT_MS = 15_000
const EXTRACTOR_MIN_CONTENT_CHARS = 200
const EXTRACTOR_MAX_RETRIES = 2 // 1 retry on transient 5xx/429 (mirror IngestService.enrich)

function estimateUsd(inputTokens: number, outputTokens: number): number {
  const usd =
    (inputTokens / 1_000_000) * INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * OUTPUT_USD_PER_MTOK
  return Math.round(usd * 10_000) / 10_000
}

// Semaphore — mirror image-extractor.ts pattern.
let inFlight = 0
const waiters: Array<() => void> = []

function acquireSlot(logger: Logger, orgId: string, knowledgeItemId: string): Promise<void> {
  if (inFlight < MAX_CONCURRENT_CHECKLIST_EXTRACTS) {
    inFlight++
    return Promise.resolve()
  }
  logger.log(
    JSON.stringify({
      level: 'log',
      event: 'docs.checklist_extract_queued',
      orgId,
      knowledgeItemId,
      inFlight,
      queueLength: waiters.length,
    }),
  )
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      const i = waiters.indexOf(run)
      if (i >= 0) waiters.splice(i, 1)
      reject(new Error('checklist-extract-queue-timeout'))
    }, EXTRACTOR_QUEUE_TIMEOUT_MS)
    const run = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      inFlight++
      resolve()
    }
    waiters.push(run)
  })
}

function releaseSlot(): void {
  inFlight = Math.max(0, inFlight - 1)
  const next = waiters.shift()
  if (next) next()
}

// Response shape Claude must emit. Strict JSON — fail-soft on parse miss.
const ExtractRawResponseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  steps: z.array(ChecklistStepSchema).default([]),
  schedule: ScheduleSchema,
  audience: AudienceSchema,
})

export type ChecklistExtractInput = {
  knowledgeItemId: string
  orgId: string
  title: string
  content: string
  userId: string | null // audit-M8 — actingUserId for docs.checklist_extracted
  kindSource: 'matched' | 'accept-type' // audit-M5 — how this KI arrived at procedural
}

@Injectable()
export class ChecklistExtractorService implements OnModuleInit {
  private readonly logger = new Logger(ChecklistExtractorService.name)
  private client!: Anthropic

  constructor(private readonly indexer: IndexerService) {}

  onModuleInit() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it to .env at repo root')
    this.client = new Anthropic({ apiKey })
  }

  async extract(input: ChecklistExtractInput): Promise<ChecklistDto | null> {
    const startedAt = Date.now()

    // audit-S2 — skip extractor for obviously-empty content; burn no cost.
    if (input.content.trim().length < EXTRACTOR_MIN_CONTENT_CHARS) {
      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'docs.checklist_extract_skipped',
          orgId: input.orgId,
          knowledgeItemId: input.knowledgeItemId,
          reason: 'content-too-short',
          contentLength: input.content.trim().length,
        }),
      )
      return null
    }

    // audit-M2 — semaphore. Queue-timeout also fails soft.
    try {
      await acquireSlot(this.logger, input.orgId, input.knowledgeItemId)
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'docs.checklist_extract_call',
          orgId: input.orgId,
          knowledgeItemId: input.knowledgeItemId,
          durationMs: Date.now() - startedAt,
          result: 'error',
          reason: 'queue-timeout',
          error: sanitiseError(err),
        }),
      )
      return null
    }

    try {
      const content = input.content.slice(0, EXTRACTOR_MAX_CONTENT_CHARS)
      const title = input.title.slice(0, 200) || '(untitled)'
      const prompt = buildPrompt(title, content)

      // audit-S4 — 1-retry on transient 5xx/429 (mirror IngestService.enrich).
      let response: Awaited<ReturnType<Anthropic['messages']['create']>> | null = null
      let lastErr: unknown = null
      for (let attempt = 1; attempt <= EXTRACTOR_MAX_RETRIES; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), EXTRACTOR_CALL_TIMEOUT_MS)
        try {
          // Source: https://docs.anthropic.com/en/api/messages · verified 2026-04-21
          response = await this.client.messages.create(
            {
              model: 'claude-sonnet-4-6',
              max_tokens: EXTRACTOR_MAX_TOKENS,
              messages: [{ role: 'user', content: prompt }],
            },
            { signal: controller.signal },
          )
          clearTimeout(timer)
          break
        } catch (err) {
          clearTimeout(timer)
          lastErr = err
          const status =
            err && typeof err === 'object' && 'status' in err
              ? (err as { status: number }).status
              : null
          const isTransient = status !== null && (status >= 500 || status === 429)
          if (attempt < EXTRACTOR_MAX_RETRIES && isTransient) {
            this.logger.warn(
              JSON.stringify({
                level: 'warn',
                event: 'docs.checklist_extract_call',
                orgId: input.orgId,
                knowledgeItemId: input.knowledgeItemId,
                durationMs: Date.now() - startedAt,
                result: 'retry',
                attempt,
                error: sanitiseError(err),
              }),
            )
            continue
          }
          // Non-transient OR final attempt — bubble to the outer catch for uniform fail-soft.
          throw err
        }
      }

      if (!response) throw lastErr ?? new Error('checklist-extract-no-response')

      const rawText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('')
      const stripped = rawText
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim()

      let parsed: z.infer<typeof ExtractRawResponseSchema>
      try {
        parsed = ExtractRawResponseSchema.parse(JSON.parse(stripped))
      } catch (parseErr) {
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'docs.checklist_extract_call',
            orgId: input.orgId,
            knowledgeItemId: input.knowledgeItemId,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            estimatedUsd: estimateUsd(response.usage.input_tokens, response.usage.output_tokens),
            durationMs: Date.now() - startedAt,
            result: 'error',
            reason: 'parse-failed',
            error: sanitiseError(parseErr),
          }),
        )
        return null
      }

      // audit-M3 — step-index contiguity normalization. 04-05 walkthrough runtime
      // depends on indices being [0..N-1] by array order.
      const normalized: ChecklistStep[] = parsed.steps.map((s, i) => ({ ...s, index: i }))

      const schedule: Schedule = parsed.schedule
      const audience: Audience = parsed.audience

      const checklist = await prisma.checklist.upsert({
        where: { knowledgeItemId: input.knowledgeItemId },
        create: {
          organizationId: input.orgId,
          knowledgeItemId: input.knowledgeItemId,
          title: parsed.title,
          steps: normalized as unknown as object[],
          schedule: schedule as unknown as object,
          audience: audience as unknown as object,
        },
        update: {
          title: parsed.title,
          steps: normalized as unknown as object[],
          schedule: schedule as unknown as object,
          audience: audience as unknown as object,
          extractedAt: new Date(),
        },
        select: {
          id: true,
          knowledgeItemId: true,
          title: true,
          extractedAt: true,
        },
      })

      const stepCount = normalized.length
      const extractResult: 'ok' | 'empty' = stepCount === 0 ? 'empty' : 'ok'

      // audit-M1 boundary — metadata only.
      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'docs.checklist_extract_call',
          orgId: input.orgId,
          knowledgeItemId: input.knowledgeItemId,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          estimatedUsd: estimateUsd(response.usage.input_tokens, response.usage.output_tokens),
          durationMs: Date.now() - startedAt,
          stepCount,
          result: extractResult,
        }),
      )

      // audit-M5 — accountability log on success (ok OR empty — both are "extraction ran").
      this.logger.log(
        JSON.stringify({
          level: 'log',
          event: 'docs.checklist_extracted',
          orgId: input.orgId,
          actingUserId: input.userId,
          knowledgeItemId: input.knowledgeItemId,
          checklistId: checklist.id,
          stepCount,
          cadence: schedule.cadence,
          kindSource: input.kindSource,
        }),
      )

      // Phase A1 — per-step indexing into SearchableEntity. Each step becomes
      // its own retrieval target so "what's step 3 of the closing procedure"
      // hits the actual step row, not just the parent doc. Failures here are
      // soft — checklist extraction itself already succeeded.
      const venueId = await this.lookupVenueId(input.knowledgeItemId)
      const cadenceTag = schedule.cadence
      const indexJobs = normalized.map((step) =>
        this.indexer
          .upsert({
            organizationId: input.orgId,
            venueId,
            entityType: 'checklist_step',
            entityId: checklist.id,
            subKey: String(step.index),
            embeddingText: `${parsed.title} — step ${step.index + 1}: ${step.text}`,
            tags: [parsed.title, cadenceTag].filter((t): t is string => !!t),
            kind: step.kind,
            title: `${parsed.title} — step ${step.index + 1}`,
            summary: step.text,
            metadata: {
              checklistId: checklist.id,
              knowledgeItemId: input.knowledgeItemId,
              stepIndex: step.index,
              stepKind: step.kind,
              required: step.required,
              cadence: cadenceTag,
            },
          })
          .catch((err) => {
            this.logger.warn(
              JSON.stringify({
                level: 'warn',
                event: 'docs.checklist_step_index_failed',
                orgId: input.orgId,
                knowledgeItemId: input.knowledgeItemId,
                checklistId: checklist.id,
                stepIndex: step.index,
                error: sanitiseError(err),
              }),
            )
          }),
      )
      await Promise.all(indexJobs)

      return {
        id: checklist.id,
        knowledgeItemId: checklist.knowledgeItemId,
        title: checklist.title,
        steps: normalized,
        schedule,
        audience,
        extractedAt: checklist.extractedAt.toISOString(),
      }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'docs.checklist_extract_call',
          orgId: input.orgId,
          knowledgeItemId: input.knowledgeItemId,
          durationMs: Date.now() - startedAt,
          result: 'error',
          error: sanitiseError(err),
        }),
      )
      return null
    } finally {
      releaseSlot()
    }
  }

  private async lookupVenueId(knowledgeItemId: string): Promise<string | null> {
    const ki = await prisma.knowledgeItem.findUnique({
      where: { id: knowledgeItemId },
      select: { venueId: true },
    })
    return ki?.venueId ?? null
  }
}

function buildPrompt(title: string, content: string): string {
  return `You are a procedural-document extractor for a hospitality operations assistant. Given the document below, produce structured checklist data.

Return STRICT JSON with this shape:
{
  "title":   "<short label, 1-5 words>",
  "steps":   [{ "index": 0, "text": "...", "kind": "tick|numeric|photo|text", "required": true, "hint": null }, ...],
  "schedule": {
    "rawText":    "echo of source schedule phrase (e.g. 'every Monday morning') or '' if none explicit",
    "cadence":    "daily|weekly|monthly|shift-start|shift-end|ad-hoc|unknown",
    "timeOfDay":  "HH:MM or null",
    "dayOfWeek":  0-6 Sunday=0, or null,
    "dayOfMonth": 1-31 or null,
    "notes":      "any extra context or null"
  },
  "audience": {
    "rawText": "echo of source audience phrase or ''",
    "roles":   ["staff" | "manager" | "owner", ...],
    "notes":   "any extra context or null"
  }
}

Rules:
- Keys above are required; you may add MORE keys inside schedule/audience/each step if the doc warrants, but you MUST produce the ones listed.
- If the doc describes NO procedural steps, return "steps": [].
- If cadence is ambiguous, use "unknown" and put the source phrase in rawText.
- kind = "tick" for ordinary checkboxes; "numeric" for readings/counts; "photo" for required-evidence steps; "text" for free-form notes.

Title: ${title}
Content (may be truncated):
${content}

Return STRICT JSON. No markdown fences. No commentary.`
}
