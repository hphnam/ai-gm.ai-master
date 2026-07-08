// 01-03 PhoneService — owns User.phoneNumber + User.phoneVerifiedAt exclusively.
// If a future plan enables better-auth's phoneNumber plugin, audit this service for
// contract drift BEFORE merging — plugin's default user-update semantics conflict
// with the linkVerifiedNumber transaction (uniqueness check + single transaction).

import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { PENDING_VERIFICATION_TTL_MS, PhoneRateLimit, type PhoneStatusResponse } from '../../types'
import { createRedisRateLimiter } from '../integrations/rate-limit'
import { RealtimeGateway } from '../realtime/realtime.gateway'

export type PhoneErrorCode =
  | 'phone-already-linked'
  | 'phone-change-requires-unlink'
  | 'phone-verification-failed'
  | 'phone-rate-limited'
  | 'phone-service-unavailable'

export class PhoneError extends Error {
  constructor(
    public readonly code: PhoneErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code)
    this.name = 'PhoneError'
  }
}

function hashPhone(phoneNumber: string): string {
  return createHash('sha256').update(phoneNumber).digest('hex').slice(0, 16)
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

// Redis-backed so the send caps hold across API instances (an in-process
// counter would be multiplied by the node count behind the load balancer).
// failClosed: these guard OTP delivery to arbitrary phone numbers — if Redis
// is down we must NOT become an open relay that bombs third parties, so a
// counter outage rejects sends rather than waving them through.
const sendPerUserLimit = createRedisRateLimiter(
  PhoneRateLimit.WINDOW_MS,
  PhoneRateLimit.MAX_SENDS_PER_USER,
  'phone-send-user',
  { failClosed: true },
)
const sendPerNumberLimit = createRedisRateLimiter(
  PhoneRateLimit.WINDOW_MS,
  PhoneRateLimit.MAX_SENDS_PER_NUMBER,
  'phone-send-number',
  { failClosed: true },
)
const sendPerIpLimit = createRedisRateLimiter(
  PhoneRateLimit.WINDOW_MS,
  PhoneRateLimit.MAX_SENDS_PER_IP,
  'phone-send-ip',
  { failClosed: true },
)

type PendingEntry = {
  phoneNumber: string
  phoneHash: string
  startedAt: number
  expiresAt: number
}

@Injectable()
export class PhoneService {
  private readonly logger = new Logger(PhoneService.name)

  // Send throttles are Redis-backed (see the module-level limiters above).
  // pendingVerifications stays in-memory — it's short-lived per-user state,
  // not a cross-node abuse guard.
  private readonly pendingVerifications = new Map<string, PendingEntry>()

  constructor(private readonly realtime: RealtimeGateway) {}

  async assertSendRateLimit(userId: string, phoneHash: string, ipHash: string): Promise<void> {
    const user = await sendPerUserLimit.check(userId)
    if (!user.ok) {
      this.logger.warn(
        JSON.stringify({
          event: 'phone.rate_limited',
          userId,
          window: 'user-send-15m',
        }),
      )
      throw new PhoneError('phone-rate-limited', {
        retryAfterSeconds: user.retryAfterSeconds,
        window: 'user-send-15m',
      })
    }
    const num = await sendPerNumberLimit.check(phoneHash)
    if (!num.ok) {
      this.logger.warn(
        JSON.stringify({
          event: 'phone.rate_limited',
          phoneHash,
          window: 'number-send-15m',
        }),
      )
      throw new PhoneError('phone-rate-limited', {
        retryAfterSeconds: num.retryAfterSeconds,
        window: 'number-send-15m',
      })
    }
    const ip = await sendPerIpLimit.check(ipHash)
    if (!ip.ok) {
      this.logger.warn(
        JSON.stringify({
          event: 'phone.rate_limited',
          ipHash,
          window: 'ip-send-15m',
        }),
      )
      throw new PhoneError('phone-rate-limited', {
        retryAfterSeconds: ip.retryAfterSeconds,
        window: 'ip-send-15m',
      })
    }
  }

  async assertNoExistingPhone(userId: string): Promise<void> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    })
    if (u?.phoneNumber) {
      const currentPhoneHash = hashPhone(u.phoneNumber)
      this.logger.warn(
        JSON.stringify({
          event: 'phone.change_without_unlink_blocked',
          userId,
          currentPhoneHash,
        }),
      )
      throw new PhoneError('phone-change-requires-unlink', { currentPhoneHash })
    }
  }

  recordPendingVerification(userId: string, phoneNumber: string): void {
    const now = Date.now()
    this.pendingVerifications.set(userId, {
      phoneNumber,
      phoneHash: hashPhone(phoneNumber),
      startedAt: now,
      expiresAt: now + PENDING_VERIFICATION_TTL_MS,
    })
  }

  assertPendingVerificationMatches(userId: string, phoneNumber: string): void {
    const entry = this.pendingVerifications.get(userId)
    const now = Date.now()
    if (!entry || entry.phoneNumber !== phoneNumber) {
      this.logger.warn(
        JSON.stringify({
          event: 'phone.cross_session_blocked',
          attemptingUserId: userId,
          phoneHash: hashPhone(phoneNumber),
        }),
      )
      throw new PhoneError('phone-verification-failed')
    }
    if (entry.expiresAt < now) {
      this.pendingVerifications.delete(userId)
      throw new PhoneError('phone-verification-failed')
    }
  }

  consumePendingVerification(userId: string): void {
    this.pendingVerifications.delete(userId)
  }

  async linkVerifiedNumber(
    userId: string,
    phoneNumber: string,
  ): Promise<{ phoneNumber: string; phoneVerifiedAt: Date }> {
    const phoneHash = hashPhone(phoneNumber)
    return prisma.$transaction(async (tx) => {
      const owner = await tx.user.findFirst({
        where: { phoneNumber, NOT: { id: userId } },
        select: { id: true },
      })
      if (owner) {
        this.logger.warn(
          JSON.stringify({
            event: 'phone.already_linked_blocked',
            attemptingUserId: userId,
            ownerUserId: owner.id,
            phoneHash,
          }),
        )
        throw new PhoneError('phone-already-linked')
      }
      try {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { phoneNumber, phoneVerifiedAt: new Date(), phoneNumberVerified: true },
          select: { phoneNumber: true, phoneVerifiedAt: true },
        })
        this.logger.log(JSON.stringify({ event: 'phone.verified', userId, phoneHash }))
        const verifiedAt = updated.phoneVerifiedAt!
        this.realtime.emitPhoneStatusChanged(userId, {
          phoneNumber: updated.phoneNumber!,
          phoneVerifiedAt: verifiedAt.toISOString(),
        })
        return {
          phoneNumber: updated.phoneNumber!,
          phoneVerifiedAt: verifiedAt,
        }
      } catch (err) {
        // P2002 unique-constraint race — the findFirst above can miss a concurrent insert.
        if ((err as { code?: string } | null)?.code === 'P2002') {
          this.logger.warn(
            JSON.stringify({
              event: 'phone.already_linked_blocked',
              attemptingUserId: userId,
              phoneHash,
              via: 'P2002',
            }),
          )
          throw new PhoneError('phone-already-linked')
        }
        throw err
      }
    })
  }

  async unlinkNumber(userId: string): Promise<{ wasLinked: boolean }> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    })
    if (!u?.phoneNumber) {
      return { wasLinked: false }
    }
    const priorPhoneHash = hashPhone(u.phoneNumber)
    await prisma.user.update({
      where: { id: userId },
      data: { phoneNumber: null, phoneVerifiedAt: null, phoneNumberVerified: false },
    })
    this.logger.log(JSON.stringify({ event: 'phone.unlinked', userId, priorPhoneHash }))
    return { wasLinked: true }
  }

  async getStatus(userId: string): Promise<PhoneStatusResponse> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true, phoneVerifiedAt: true },
    })
    return {
      phoneNumber: u?.phoneNumber ?? null,
      phoneVerifiedAt: u?.phoneVerifiedAt?.toISOString() ?? null,
    }
  }

  static hashIpStatic(ip: string): string {
    return hashIp(ip)
  }

  static hashPhoneStatic(phoneNumber: string): string {
    return hashPhone(phoneNumber)
  }
}
