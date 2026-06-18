import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common'
import Redis from 'ioredis'
import { prisma } from '../../database/prisma'
import { CHAT_STARTERS_TTL_SECONDS } from './chat-starters.queue'
import { ChatStartersPayloadSchema, type StarterQuestion } from './dto/chat-starters.dto'

/// Generic hospitality fallbacks — shown when Redis has no payload for the
/// venue (cold start, before the first weekly fanout has run, or after a
/// generation failure that exhausted the TTL). Deliberately broad so they
/// don't feel like dead canned suggestions for any specific venue.
const FALLBACK_QUESTIONS: ReadonlyArray<StarterQuestion> = [
  { text: 'What stock is below par right now?', category: 'stock' },
  { text: "What's on my list this week?", category: 'tasks' },
  { text: 'Any certs expiring in the next 30 days?', category: 'compliance' },
  { text: 'Walk me through the opening checklist.', category: 'sop' },
  { text: 'Who do I call if the ice machine is down?', category: 'supplier' },
  { text: 'What happened on the last shift I missed?', category: 'general' },
]

export type StoredStartersPayload = {
  venueId: string
  questions: StarterQuestion[]
  source: 'generated' | 'fallback'
  generatedAt: string | null
}

@Injectable()
export class ChatStartersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatStartersService.name)
  private redis!: Redis

  onModuleInit(): void {
    // Dedicated client because BullMQ's connection is heavily multiplexed for
    // job state and we don't want to share contention with cache GETs. Re-use
    // the same REDIS_URL the BullModule and Socket.IO adapter already do.
    // In production we refuse to silently fall back to localhost — that would
    // mean every API box runs a private cache and the per-venue payload would
    // randomly disappear after a deploy. In dev we default for ergonomics.
    const url = process.env.REDIS_URL
    if (!url && process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_URL is not set — chat-starters cache cannot start')
    }
    this.redis = new Redis(url ?? 'redis://127.0.0.1:6379', {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      // ioredis defaults to "retry forever" reconnects. Keep that — a network
      // blip during a Haiku run shouldn't kill the cache long-term.
    })
    this.redis.on('error', (err) => {
      this.logger.warn(
        JSON.stringify({
          event: 'chat_starters.redis_error',
          message: err.message,
        }),
      )
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined)
  }

  /// Fetch starters for a venue scoped to the caller's org. Returns a payload
  /// (generated or fallback) for legitimate org-owned venues; throws
  /// NotFoundException for a venueId that doesn't belong to the caller. The
  /// controller surfaces the 404, which keeps cross-org reads from being
  /// indistinguishable from "no data yet".
  async getForVenue(orgId: string, venueId: string): Promise<StoredStartersPayload> {
    const venue = await prisma.venue.findFirst({
      where: { id: venueId, organizationId: orgId },
      select: { id: true },
    })
    if (!venue) {
      throw new NotFoundException('venue-not-found')
    }
    const raw = await this.redis.get(this.keyFor(orgId, venueId)).catch(() => null)
    if (!raw) return this.fallback(venueId)
    try {
      const parsed = ChatStartersPayloadSchema.parse(JSON.parse(raw))
      // Defensive: an attacker who somehow wrote into Redis would still be
      // bounded by the zod parser; if their payload's venueId doesn't match
      // the requested key, drop and fall back.
      if (parsed.venueId !== venueId) return this.fallback(venueId)
      return parsed
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'chat_starters.parse_failed',
          orgId,
          venueId,
          message: (err as Error)?.message ?? 'unknown',
        }),
      )
      return this.fallback(venueId)
    }
  }

  /// Persist a generator output. The generator is the only caller — controller
  /// reads only — so this stays internal to the module (no controller method
  /// for manual writes).
  async store(
    orgId: string,
    venueId: string,
    questions: StarterQuestion[],
  ): Promise<StoredStartersPayload> {
    const payload: StoredStartersPayload = {
      venueId,
      questions,
      source: 'generated',
      generatedAt: new Date().toISOString(),
    }
    await this.redis.set(
      this.keyFor(orgId, venueId),
      JSON.stringify(payload),
      'EX',
      CHAT_STARTERS_TTL_SECONDS,
    )
    this.logger.log(
      JSON.stringify({
        event: 'chat_starters.stored',
        orgId,
        venueId,
        count: questions.length,
        ttlSeconds: CHAT_STARTERS_TTL_SECONDS,
      }),
    )
    return payload
  }

  private keyFor(orgId: string, venueId: string): string {
    return `chat:starters:${orgId}:${venueId}`
  }

  private fallback(venueId: string): StoredStartersPayload {
    return {
      venueId,
      questions: [...FALLBACK_QUESTIONS],
      source: 'fallback',
      generatedAt: null,
    }
  }
}
