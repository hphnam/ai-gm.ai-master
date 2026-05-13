// 01-03 PhoneService — owns User.phoneNumber + User.phoneVerifiedAt exclusively.
// If a future plan enables better-auth's phoneNumber plugin, audit this service for
// contract drift BEFORE merging — plugin's default user-update semantics conflict
// with the linkVerifiedNumber transaction (uniqueness check + single transaction).

import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { PENDING_VERIFICATION_TTL_MS, PhoneRateLimit, type PhoneStatusResponse } from '../../types'
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

type Bucket = { count: number; windowStart: number }
type PendingEntry = {
  phoneNumber: string
  phoneHash: string
  startedAt: number
  expiresAt: number
}

@Injectable()
export class PhoneService {
  private readonly logger = new Logger(PhoneService.name)

  // In-memory maps — single-node POC scope. Multi-instance deployment needs Redis-backed
  // throttler (see SCOPE LIMITS in 01-03-PLAN.md).
  private readonly sendsPerUser = new Map<string, Bucket>()
  private readonly sendsPerNumber = new Map<string, Bucket>()
  private readonly sendsPerIp = new Map<string, Bucket>()
  private readonly pendingVerifications = new Map<string, PendingEntry>()

  constructor(private readonly realtime: RealtimeGateway) {}

  private checkBucket(
    map: Map<string, Bucket>,
    key: string,
    max: number,
  ): {
    ok: boolean
    retryAfterSeconds: number
  } {
    const now = Date.now()
    const bucket = map.get(key)
    if (!bucket || now - bucket.windowStart > PhoneRateLimit.WINDOW_MS) {
      map.set(key, { count: 1, windowStart: now })
      return { ok: true, retryAfterSeconds: 0 }
    }
    bucket.count += 1
    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.windowStart + PhoneRateLimit.WINDOW_MS - now) / 1000),
      )
      return { ok: false, retryAfterSeconds }
    }
    return { ok: true, retryAfterSeconds: 0 }
  }

  assertSendRateLimit(userId: string, phoneHash: string, ipHash: string): void {
    const user = this.checkBucket(this.sendsPerUser, userId, PhoneRateLimit.MAX_SENDS_PER_USER)
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
    const num = this.checkBucket(
      this.sendsPerNumber,
      phoneHash,
      PhoneRateLimit.MAX_SENDS_PER_NUMBER,
    )
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
    const ip = this.checkBucket(this.sendsPerIp, ipHash, PhoneRateLimit.MAX_SENDS_PER_IP)
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
          data: { phoneNumber, phoneVerifiedAt: new Date() },
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
      data: { phoneNumber: null, phoneVerifiedAt: null },
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
