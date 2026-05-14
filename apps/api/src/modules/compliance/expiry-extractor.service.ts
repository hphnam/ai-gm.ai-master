import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { ComplianceService, type ExtractedExpiry } from './compliance.service'
import { COMPLIANCE_CATEGORIES } from './dto/compliance.dto'

const CALL_TIMEOUT_MS = 10_000
const MAX_CONTENT_CHARS = 6000
const MIN_CONFIDENCE_TO_PERSIST = 0.6

/// Wave 2 — compliance / expiry classifier and field extractor. Runs once per
/// new KnowledgeItem (called from ingest after persistence). Uses Claude Haiku
/// because the task is bounded (classify + 6 fields) and we run it on every
/// upload — cost matters. Soft-fails on any error (the doc still indexes; the
/// expiry record just doesn't get created).
@Injectable()
export class ExpiryExtractorService implements OnModuleInit {
  private readonly logger = new Logger(ExpiryExtractorService.name)
  private client!: Anthropic

  constructor(private readonly compliance: ComplianceService) {}

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.client = new Anthropic({ apiKey })
  }

  /// Best-effort extractor. Caller passes an already-persisted knowledgeItemId
  /// and the orgId for scoping. Reads title + content from the row, runs the
  /// classifier, and on a positive hit upserts via ComplianceService. Returns
  /// the upserted record on success, null when the doc isn't a compliance doc
  /// or when extraction failed.
  async extractAndStore(knowledgeItemId: string, orgId: string): Promise<{ id: string } | null> {
    if (process.env.EXPIRY_EXTRACTOR_DISABLED === '1') return null

    const doc = await prisma.knowledgeItem.findFirst({
      where: { id: knowledgeItemId, organizationId: orgId },
      select: {
        id: true,
        organizationId: true,
        venueId: true,
        content: true,
        metadata: true,
        aiSummary: true,
      },
    })
    if (!doc) return null

    const metadata = (doc.metadata ?? {}) as Record<string, unknown>
    const title =
      typeof metadata.title === 'string' && metadata.title.trim().length > 0
        ? metadata.title.trim()
        : null

    const extracted = await this.runExtractor(title, doc.content)
    if (!extracted) return null
    if (extracted.confidence < MIN_CONFIDENCE_TO_PERSIST) {
      this.logger.log(
        JSON.stringify({
          event: 'expiry_extractor.skip_low_confidence',
          knowledgeItemId,
          orgId,
          confidence: extracted.confidence,
          category: extracted.category,
        }),
      )
      return null
    }

    try {
      const row = await this.compliance.upsertFromExtractor(
        orgId,
        knowledgeItemId,
        doc.venueId,
        extracted,
      )
      return { id: row.id }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'expiry_extractor.upsert_failed',
          knowledgeItemId,
          message: (err as Error)?.message ?? 'unknown',
        }),
      )
      return null
    }
  }

  private async runExtractor(
    title: string | null,
    content: string,
  ): Promise<ExtractedExpiry | null> {
    const truncated = content.slice(0, MAX_CONTENT_CHARS)
    const prompt = `You classify hospitality documents. Given the title and the first part of the body, decide whether this document represents a COMPLIANCE OBLIGATION with a future expiry / renewal date that the venue's operator must track.

A "compliance obligation" is something whose expiry / renewal date matters for legal, insurance, or operational continuity:
  - food hygiene certificate (per-staff)
  - personal alcohol licence (per-staff)
  - premises licence (per-venue)
  - PAT (electrical) testing certificate
  - gas safety certificate
  - fire risk assessment
  - public liability / employers liability / property insurance renewal
  - equipment service interval (extractor fan, beer line clean, ice machine service, walk-in fridge, dishwasher, lift LOLER)

NOT compliance: SOPs, recipes, supplier price lists, opening checklists, training notes, incident logs, menus, contracts without dated renewal, generic policies. If the doc is anything other than a dated cert / service record / insurance renewal, return { isCompliance: false }.

When isCompliance is true, also return:
  category   one of: food_hygiene | personal_licence | premises_licence | pat | gas_safety | fire_risk | insurance | equipment_service | other
  expiresAt  ISO 8601 UTC datetime — the calendar date the document expires / next service / renewal is due. If the doc shows only "issued + valid for X years", compute issued + X years. If no expiry date is present at all, return isCompliance:false (we will not invent a date).
  title      a concise human label, e.g. "Food Hygiene Certificate — Sarah Brown" or "Beer line clean (cellar)".
  person     the name of the staff member it applies to, or null for venue-scoped certs (premises licence, fire risk, insurance, equipment).
  asset      the equipment item it applies to (for equipment_service), or null otherwise.
  renewalCostGbp the stated renewal cost in GBP if the doc shows it, otherwise null.
  confidence a number from 0.00 to 1.00 — your overall certainty that this is a real compliance doc with a real expiry date, given how clearly the date and category are stated. <0.6 will be discarded.

Return STRICT JSON. No markdown fences. No commentary. Shape (positive case):
{"isCompliance":true,"category":"food_hygiene","expiresAt":"2026-09-30T00:00:00Z","title":"Food Hygiene Certificate — Sarah Brown","person":"Sarah Brown","asset":null,"renewalCostGbp":null,"confidence":0.95}

Negative case: {"isCompliance":false}

Title: ${title ?? '(untitled)'}
Body:
${truncated}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
    try {
      const response = await this.client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
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
      const parsed = JSON.parse(stripped) as Record<string, unknown>
      if (parsed.isCompliance !== true) return null
      const category = typeof parsed.category === 'string' ? parsed.category.trim() : null
      const expiresAtRaw = typeof parsed.expiresAt === 'string' ? parsed.expiresAt.trim() : null
      const titleOut = typeof parsed.title === 'string' ? parsed.title.trim() : null
      const person =
        typeof parsed.person === 'string' && parsed.person.trim().length > 0
          ? parsed.person.trim()
          : null
      const asset =
        typeof parsed.asset === 'string' && parsed.asset.trim().length > 0
          ? parsed.asset.trim()
          : null
      const renewalCostGbp =
        typeof parsed.renewalCostGbp === 'number' && parsed.renewalCostGbp >= 0
          ? parsed.renewalCostGbp
          : null
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0

      if (!category || !expiresAtRaw || !titleOut) return null
      const expiresAt = new Date(expiresAtRaw)
      if (Number.isNaN(expiresAt.getTime())) return null
      const safeCategory = (COMPLIANCE_CATEGORIES as readonly string[]).includes(category)
        ? category
        : 'other'

      return {
        title: titleOut,
        category: safeCategory,
        expiresAt,
        personName: person,
        assetName: asset,
        renewalCostGbp,
        confidence,
      }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'expiry_extractor.call_failed',
          message: (err as Error)?.message ?? 'unknown',
        }),
      )
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}
