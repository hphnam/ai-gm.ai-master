import Anthropic from '@anthropic-ai/sdk'
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { prisma } from '../../database/prisma'

export type GmUserProfile = {
  summary: string
  likelyShiftRole: string | null
  commonTopics: string[]
  languageHints: string | null
  refreshedAt: string
  sourceMessageCount: number
}

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MIN_MESSAGES_FOR_PROFILE = 5
const MAX_HISTORY_MESSAGES_FOR_SUMMARY = 60
const CALL_TIMEOUT_MS = 6000

/// Phase F (Task #14) — lazy per-user GM profile cache.
///
/// Derives a short summary of how a user uses the chat from their message
/// history, stored on OrganizationMember.metadata.gmProfile, refreshed at
/// most every 7 days. Cheap (Haiku, one call per refresh per user).
@Injectable()
export class UserProfileService implements OnModuleInit {
  private readonly logger = new Logger(UserProfileService.name)
  private client!: Anthropic

  onModuleInit(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    this.client = new Anthropic({ apiKey })
  }

  /// Hot path: returns cached profile immediately (even if stale). If a
  /// refresh is due, fires it in the background — the next turn benefits.
  /// Avoids blocking the user-perceived chat latency on a Haiku call.
  async getOrRefresh(userId: string, orgId: string): Promise<GmUserProfile | null> {
    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
      select: { id: true, role: true, metadata: true },
    })
    if (!member) return null

    const meta = (member.metadata ?? {}) as Record<string, unknown>
    const cached = meta.gmProfile as GmUserProfile | undefined
    const refreshedAt = cached?.refreshedAt ? new Date(cached.refreshedAt).getTime() : 0
    const isFresh = refreshedAt > 0 && Date.now() - refreshedAt < REFRESH_TTL_MS

    if (!isFresh) {
      // Fire-and-forget refresh; result lands on the next turn.
      void this.refreshInBackground(member.id, member.role, userId, meta).catch(() => undefined)
    }
    return cached ?? null
  }

  private async refreshInBackground(
    memberId: string,
    role: string,
    userId: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    const messages = await prisma.chatMessage.findMany({
      where: {
        role: 'user',
        conversation: { userId },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_HISTORY_MESSAGES_FOR_SUMMARY,
      select: { content: true },
    })
    if (messages.length < MIN_MESSAGES_FOR_PROFILE) return

    const summary = await this.summarise(role, messages.map((m) => m.content).reverse())
    if (!summary) return

    const newProfile: GmUserProfile = {
      ...summary,
      refreshedAt: new Date().toISOString(),
      sourceMessageCount: messages.length,
    }
    const newMeta = { ...meta, gmProfile: newProfile }
    await prisma.organizationMember
      .update({ where: { id: memberId }, data: { metadata: newMeta as object } })
      .catch(() => undefined)
  }

  private async summarise(
    role: string,
    messages: string[],
  ): Promise<{
    summary: string
    likelyShiftRole: string | null
    commonTopics: string[]
    languageHints: string | null
  } | null> {
    const flattened = messages.map((m, i) => `${i + 1}. ${m.slice(0, 280)}`).join('\n')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
    try {
      const response = await this.client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `You profile a hospitality staff member based on their last few chat messages. Output STRICT JSON, no markdown.

Schema:
{
  "summary": "<1-2 sentences capturing how this person uses the chat — what they ask about, how they phrase things>",
  "likelyShiftRole": "<one of: bartender, glass collector, kitchen, duty manager, owner, cleaner, ops, unknown>",
  "commonTopics": ["<3-5 short topic tags drawn from their messages: stock, closing, troubleshooting, suppliers, training>"],
  "languageHints": "<brief note on their style: prefers terse answers, asks lots of follow-ups, etc. — null if nothing notable>"
}

Org-stored role for this user: ${role}

Last messages (most-recent last):
${flattened}

Return STRICT JSON only.`,
            },
          ],
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
      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 400) : '',
        likelyShiftRole: typeof parsed.likelyShiftRole === 'string' ? parsed.likelyShiftRole : null,
        commonTopics: Array.isArray(parsed.commonTopics)
          ? (parsed.commonTopics as unknown[])
              .filter((v): v is string => typeof v === 'string')
              .slice(0, 5)
          : [],
        languageHints: typeof parsed.languageHints === 'string' ? parsed.languageHints : null,
      }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'user_profile.summarise_failed',
          message: (err as Error).message,
        }),
      )
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}
