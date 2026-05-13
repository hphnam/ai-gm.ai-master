// Plan 04-02 Task 2 — per-tenant document classifier (Claude-based).
// Source: https://docs.anthropic.com/en/api/messages · verified 2026-04-21
// Source: https://docs.anthropic.com/en/docs/about-claude/pricing.md · verified 2026-04-21
//   (Sonnet 4.6 pricing: $3/MTok input, $15/MTok output — matches Plan 04-01 image extractor)
// Source: apps/api/src/common/sanitise-error.ts (Plan 03-05 / Plan 04-01 audit-M2 shared util)
//
// Contract:
//   classify({ content, title, orgId }) → ClassifyResult
//     'matched'  — existing DocumentType matches with confidence ≥ 0.7
//     'proposal' — classifier proposes a new type (owner confirms in UI)
//     'none'     — genuinely low signal; KnowledgeItem persists unclassified
//
// audit-M1 boundary: logger payloads carry metadata ONLY (tokens/USD/mime/counts).
//   NEVER: document content, proposal schema body, base64, Anthropic API key.

import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { z } from 'zod'
import { sanitiseError } from '../../common/sanitise-error'
import { prisma } from '../../database/prisma'
import { type ProposedDocType, ProposedDocTypeSchema } from '../../types'

// Project-wide constant — D-04-02-C registered for per-tenant tuning.
export const CLASSIFIER_AUTO_ACCEPT_CONFIDENCE = 0.7
const CLASSIFIER_MAX_CONTENT_CHARS = 30_000
const CLASSIFIER_MAX_EXISTING_TYPES = 50
const CLASSIFIER_MAX_TOKENS = 1024

// Sonnet 4.6 pricing — duplicate (not imported) to keep modules independent.
// Matches image-extractor.ts; diverging numbers = audit flag.
const INPUT_USD_PER_MTOK = 3
const OUTPUT_USD_PER_MTOK = 15
function estimateUsd(inputTokens: number, outputTokens: number): number {
  const usd =
    (inputTokens / 1_000_000) * INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * OUTPUT_USD_PER_MTOK
  return Math.round(usd * 10_000) / 10_000
}

// Wire shape returned by Claude (strict JSON). Validated via Zod before use.
// Optional venueGuess is asked for when the caller passed `venues` and the
// uploader did NOT pre-select a venue. Sub-threshold guesses are dropped.
const ClassifyRawResponseSchema = z.intersection(
  z.union([
    z.object({
      match: z.object({
        typeId: z.string().uuid(),
        confidence: z.number().min(0).max(1),
      }),
    }),
    z.object({
      proposal: ProposedDocTypeSchema,
    }),
    z.object({
      none: z.literal(true),
    }),
  ]),
  z.object({
    venueGuess: z
      .object({
        venueId: z.string().uuid(),
        confidence: z.number().min(0).max(1),
      })
      .nullable()
      .optional(),
  }),
)

// Threshold above which we auto-apply the classifier's venue guess. Set
// conservatively — a wrong-venue auto-apply forces the GM to discover-and-fix,
// which is worse than leaving it global.
export const VENUE_AUTO_ASSIGN_CONFIDENCE = 0.75

export type ClassifierVenue = { id: string; name: string }

export type ClassifyInput = {
  content: string
  title?: string | null
  orgId: string
  // When provided AND the uploader did not pre-select a venue, the classifier
  // is asked to propose one. Pass `null`/omit to skip venue resolution.
  venues?: ClassifierVenue[] | null
  // Optional Reducto-derived hints fed into the prompt as additional structural
  // signal (e.g. "12 pages, 3 tables, headers: Date|Item|Cost"). All values are
  // safe metadata — no row contents.
  structuralHints?: {
    pageCount?: number
    tableCount?: number
    tableHeaders?: string[][]
  } | null
}

export type ClassifyResult =
  | { kind: 'matched'; typeId: string; confidence: number; venueGuess: VenueGuess }
  | { kind: 'proposal'; proposal: ProposedDocType; venueGuess: VenueGuess }
  | { kind: 'none'; venueGuess: VenueGuess }

export type VenueGuess = { venueId: string; confidence: number } | null

@Injectable()
export class ClassifierService implements OnModuleInit {
  private readonly logger = new Logger(ClassifierService.name)
  private client!: Anthropic

  onModuleInit() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it to .env at repo root')
    this.client = new Anthropic({ apiKey })
  }

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    const startedAt = Date.now()
    const existingTypes = await prisma.documentType.findMany({
      where: { organizationId: input.orgId },
      select: { id: true, name: true, description: true },
      orderBy: { confirmedAt: 'desc' },
      take: CLASSIFIER_MAX_EXISTING_TYPES,
    })

    const content = input.content.slice(0, CLASSIFIER_MAX_CONTENT_CHARS)
    const title = input.title?.slice(0, 200) ?? '(untitled)'
    const venues = input.venues ?? null
    const askVenue = !!venues && venues.length > 0
    const prompt = buildPrompt(
      existingTypes,
      content,
      title,
      askVenue ? venues : null,
      input.structuralHints ?? null,
    )

    try {
      // Source: https://docs.anthropic.com/en/api/messages · verified 2026-04-21
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: CLASSIFIER_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      })

      const rawText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('')
      const stripped = rawText
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim()

      let parsed: z.infer<typeof ClassifyRawResponseSchema>
      try {
        parsed = ClassifyRawResponseSchema.parse(JSON.parse(stripped))
      } catch (parseErr) {
        this.logger.warn(
          JSON.stringify({
            level: 'warn',
            event: 'classifier.parse_failed',
            orgId: input.orgId,
            error: sanitiseError(parseErr),
          }),
        )
        this.emitCallLog(input.orgId, response.usage, 'error', existingTypes.length, startedAt)
        return { kind: 'none', venueGuess: null }
      }

      // Validate the venue guess against the org's actual venues — drop
      // hallucinated UUIDs. Caller is responsible for the auto-assign threshold.
      const venueGuess: VenueGuess = (() => {
        const g = parsed.venueGuess
        if (!g || !venues) return null
        if (!venues.some((v) => v.id === g.venueId)) return null
        return { venueId: g.venueId, confidence: g.confidence }
      })()

      // Matched branch — only accept above threshold; sub-threshold → treat as no-match.
      if ('match' in parsed) {
        const matchedTypeExists = existingTypes.some((t) => t.id === parsed.match.typeId)
        if (matchedTypeExists && parsed.match.confidence >= CLASSIFIER_AUTO_ACCEPT_CONFIDENCE) {
          this.emitCallLog(input.orgId, response.usage, 'matched', existingTypes.length, startedAt)
          return {
            kind: 'matched',
            typeId: parsed.match.typeId,
            confidence: parsed.match.confidence,
            venueGuess,
          }
        }
        // Sub-threshold OR hallucinated typeId — fall through to none.
        this.emitCallLog(input.orgId, response.usage, 'none', existingTypes.length, startedAt)
        return { kind: 'none', venueGuess }
      }

      if ('proposal' in parsed) {
        this.emitCallLog(input.orgId, response.usage, 'proposal', existingTypes.length, startedAt)
        return { kind: 'proposal', proposal: parsed.proposal, venueGuess }
      }

      // { none: true }
      this.emitCallLog(input.orgId, response.usage, 'none', existingTypes.length, startedAt)
      return { kind: 'none', venueGuess }
    } catch (err) {
      // sanitiseError is the ONLY path fetch/SDK errors enter the log — prevents Authorization
      // header leakage via the default error-serialization path (audit-M2 shared util).
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'classifier.call_failed',
          orgId: input.orgId,
          existingTypesCount: existingTypes.length,
          durationMs: Date.now() - startedAt,
          error: sanitiseError(err),
        }),
      )
      return { kind: 'none', venueGuess: null }
    }
  }

  private emitCallLog(
    orgId: string,
    usage: { input_tokens: number; output_tokens: number },
    result: 'matched' | 'proposal' | 'none' | 'error',
    matchedExistingCount: number,
    startedAt: number,
  ): void {
    this.logger.log(
      JSON.stringify({
        level: 'log',
        event: 'docs.classifier_call',
        orgId,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        estimatedUsd: estimateUsd(usage.input_tokens, usage.output_tokens),
        matchedExistingCount,
        durationMs: Date.now() - startedAt,
        result,
      }),
    )
  }
}

function buildPrompt(
  existingTypes: Array<{ id: string; name: string; description: string | null }>,
  content: string,
  title: string,
  venues: ClassifierVenue[] | null,
  structuralHints: ClassifyInput['structuralHints'],
): string {
  const existing =
    existingTypes.length === 0
      ? "(none — this is the organization's first document type)"
      : existingTypes
          .map(
            (t) =>
              `- id: ${t.id} · name: "${t.name}"${t.description ? ` · description: "${t.description}"` : ''}`,
          )
          .join('\n')

  const venueBlock =
    venues && venues.length > 0
      ? `\n## Organization's venues (the uploader did NOT pick one):\n${venues.map((v) => `- id: ${v.id} · name: "${v.name}"`).join('\n')}\n\n## Venue rule\nIf the document content clearly references one of the venues by name (or by an unambiguous nickname / address), include \`"venueGuess":{"venueId":"<id>","confidence":<0..1>}\` alongside the main result. If you can't tell, OR if the document looks like it applies to all venues (org-wide policy, generic SOP), return \`"venueGuess":null\`. Confidence ≥0.75 means we'll auto-assign — be conservative.`
      : ''

  const structuralBlock = (() => {
    if (!structuralHints) return ''
    const parts: string[] = []
    if (typeof structuralHints.pageCount === 'number' && structuralHints.pageCount > 0) {
      parts.push(`pages: ${structuralHints.pageCount}`)
    }
    if (typeof structuralHints.tableCount === 'number' && structuralHints.tableCount > 0) {
      parts.push(`tables: ${structuralHints.tableCount}`)
    }
    if (structuralHints.tableHeaders && structuralHints.tableHeaders.length > 0) {
      const headers = structuralHints.tableHeaders
        .slice(0, 3)
        .map((h, i) => `  table ${i + 1} headers: ${h.slice(0, 12).join(' | ')}`)
        .join('\n')
      parts.push(`table headers:\n${headers}`)
    }
    return parts.length > 0 ? `\n## Structural hints (from parser):\n${parts.join('\n')}\n` : ''
  })()

  return `You are a document-intelligence classifier for a hospitality operations assistant. Your job: figure out what KIND of document this is, in the context of this organization's existing taxonomy.

## Organization's existing document types:
${existing}
${venueBlock}${structuralBlock}
## Rules
1. If the document fits an existing type with high confidence, return \`{"match":{"typeId":"<id>","confidence":<0..1>}}\`.
2. If it's genuinely a new kind of document not represented in the existing types, return \`{"proposal":{"name":"<short label>","description":"<one-liner>","schema":{...},"confidence":<0..1>,"kind":"reference"|"procedural"}}\`.
   - "name": 1-3 words, title case (e.g. "Opening Checklist", "Supplier Price List", "Fire Drill Report").
   - "description": one short sentence describing what this type is for.
   - "schema": a JSON object describing the expected fields/structure of this type (e.g. \`{"steps":"list of checklist items","schedule":"cadence like 'weekly'","role":"who performs"}\`). Keys are YOUR invention based on what this doc looks like.
   - "confidence": how sure you are this is a coherent new type (not garbage, not a mix of types).
   - "kind":
     - "procedural" ONLY if the doc describes an ordered set of tasks with some cadence (e.g. checklists, SOPs with numbered steps, daily routines, opening/closing procedures).
     - "reference" for prose, policies, menus, contact lists, price sheets, training materials.
3. Short docs are still classifiable. A single Q&A, a one-paragraph note, a brief troubleshooting tip, or a short reference card should produce a \`proposal\` (e.g. "FAQ", "Troubleshooting Note", "Quick Reference", "Staff Note"). Length alone is not a reason to bail.
4. Return \`{"none":true}\` ONLY as a last resort — when the content is empty, pure garbage (random characters, OCR noise), or has no discernible topic at all. If you can name what the doc is about in a few words, propose a category instead.

## Output
Return STRICT JSON. No markdown fences. No commentary. The object has the main result key (\`match\`, \`proposal\`, or \`none\`) and ${venues && venues.length > 0 ? 'optionally a top-level `venueGuess` (or null)' : 'no other keys'}.

## Document
Title: ${title}
Content (may be truncated):
${content}`
}
