import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { getMailMode, sendMail } from '../email/mailer'
import {
  NOTE_DIGEST_ANCHOR_HOUR_UTC,
  NOTE_DIGEST_MAX_NOTES_PER_EMAIL,
  NOTE_DIGEST_WINDOW_MS,
} from './digest.queue'
import { type DigestNote, isDigestableEmail, renderNoteDigestEmail } from './digest-email'

/// Most recent 07:00 UTC at or before `now`. Anchoring the window here (not
/// at the processing wall-clock) makes consecutive runs tile exactly even
/// when a tick drains late after downtime.
export function digestWindowEnd(now: Date): Date {
  const end = new Date(now)
  end.setUTCHours(NOTE_DIGEST_ANCHOR_HOUR_UTC, 0, 0, 0)
  if (end.getTime() > now.getTime()) end.setUTCDate(end.getUTCDate() - 1)
  return end
}

@Injectable()
export class NoteDigestService {
  private readonly logger = new Logger(NoteDigestService.name)

  async runOnce(now: Date = new Date()): Promise<{ scanned: number; emails: number }> {
    const windowEnd = digestWindowEnd(now)
    const since = new Date(windowEnd.getTime() - NOTE_DIGEST_WINDOW_MS)
    const rows = await prisma.notification.findMany({
      where: { status: 'unread', createdAt: { gte: since, lt: windowEnd } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        body: true,
        category: true,
        automated: true,
        organizationId: true,
        recipientUserId: true,
        author: { select: { name: true, email: true } },
        recipient: { select: { email: true, emailVerified: true } },
        organization: { select: { name: true } },
      },
    })

    const groups = new Map<
      string,
      {
        key: string
        userId: string
        orgId: string
        email: string
        organizationName: string
        notes: DigestNote[]
      }
    >()
    for (const r of rows) {
      // Note bodies are org-internal content — only deliver to a mailbox the
      // user has proven they control. Also drops synthetic phone-onboarding
      // placeholders (undeliverable by construction) and malformed addresses.
      if (!r.recipient.emailVerified || !isDigestableEmail(r.recipient.email)) continue
      const key = `${r.recipientUserId}:${r.organizationId}`
      let group = groups.get(key)
      if (!group) {
        group = {
          key,
          userId: r.recipientUserId,
          orgId: r.organizationId,
          email: r.recipient.email,
          organizationName: r.organization.name,
          notes: [],
        }
        groups.set(key, group)
      }
      // A null-named phone-onboarded author must not fall back to their
      // synthetic email — it embeds their phone number.
      const authorEmailSafe = r.author && isDigestableEmail(r.author.email) ? r.author.email : null
      group.notes.push({
        id: r.id,
        body: r.body,
        category: r.category,
        automated: r.automated,
        authorName: r.author?.name ?? authorEmailSafe,
      })
    }

    // Membership recheck at send time: notification rows outlive a
    // membership-only removal (user kept for another org), and yesterday's
    // unread notes must not follow someone out of the org.
    const candidates = Array.from(groups.values())
    const memberships =
      candidates.length > 0
        ? await prisma.organizationMember.findMany({
            where: { OR: candidates.map((g) => ({ organizationId: g.orgId, userId: g.userId })) },
            select: { organizationId: true, userId: true },
          })
        : []
    const memberKeys = new Set(memberships.map((m) => `${m.userId}:${m.organizationId}`))

    const appUrl = (process.env.PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    let emails = 0
    for (const group of candidates) {
      if (!memberKeys.has(group.key)) continue
      const { subject, html, text } = renderNoteDigestEmail({
        organizationName: group.organizationName,
        appUrl,
        notes: group.notes.slice(0, NOTE_DIGEST_MAX_NOTES_PER_EMAIL),
        totalUnread: group.notes.length,
      })
      if (getMailMode() === 'console') {
        this.logger.log(
          JSON.stringify({ event: 'note_digest.console_fallback', to: group.email, subject }),
        )
        emails += 1
        continue
      }
      const res = await sendMail({ to: group.email, subject, html, text })
      if (res.ok) {
        emails += 1
      } else {
        // Best-effort per recipient — one bad mailbox must not stall the run.
        this.logger.error(
          JSON.stringify({ event: 'note_digest.send_failed', recipient: group.key }),
        )
      }
    }

    if (rows.length > 0) {
      this.logger.log(JSON.stringify({ event: 'note_digest.tick', scanned: rows.length, emails }))
    }
    return { scanned: rows.length, emails }
  }
}
