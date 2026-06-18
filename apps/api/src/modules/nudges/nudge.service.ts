import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { MockOpsService } from '../mock-ops/mock-ops.service'
import { WhatsAppAdapter } from '../whatsapp/whatsapp.adapter'

export type NudgeResult =
  | { sent: true; phone: string; preview: string; recipientName: string }
  | { sent: false; reason: string }

const URGENT_CUTOFF_HOURS = 6
const MIN_BELOW_PAR_FOR_NUDGE = 1
const NUDGE_PREVIEW_LIMIT = 320

/// Phase G4 — proactive ordering nudge. Composes a tight WhatsApp message
/// when stock is below par AND a supplier cutoff is imminent, sends it to
/// the venue's duty manager (resolved from VenueContact). Cron / Trigger.dev
/// integration is the caller's job: invoke run(venueId) on whatever cadence
/// the operator wants. The /chat/nudges/:venueId/run endpoint is a manual
/// trigger surface for testing + dashboards.
@Injectable()
export class NudgeService {
  private readonly logger = new Logger(NudgeService.name)

  constructor(
    private readonly mockOps: MockOpsService,
    private readonly whatsapp: WhatsAppAdapter,
  ) {}

  async run(venueId: string, orgId: string): Promise<NudgeResult> {
    const venue = await prisma.venue.findFirst({
      where: { id: venueId, organizationId: orgId },
      select: { id: true, name: true },
    })
    if (!venue) return { sent: false, reason: 'venue not found' }

    const belowPar = await this.mockOps.getStockBelowPar(venueId)
    const cutoffs = await this.mockOps.getUpcomingCutoffs(venueId, URGENT_CUTOFF_HOURS)

    if (!belowPar.ok || belowPar.data.length < MIN_BELOW_PAR_FOR_NUDGE) {
      return { sent: false, reason: 'no items below par' }
    }
    if (!cutoffs.ok || cutoffs.data.length === 0) {
      return { sent: false, reason: 'no imminent cutoffs' }
    }

    const recipient = await this.resolveRecipient(venueId)
    if (!recipient) return { sent: false, reason: 'no contactable duty manager' }

    const message = this.composeMessage(venue.name, belowPar.data, cutoffs.data).slice(
      0,
      NUDGE_PREVIEW_LIMIT,
    )

    try {
      await this.whatsapp.sendText(recipient.phone, message)
      this.logger.log(
        JSON.stringify({
          event: 'nudge.sent',
          venueId,
          orgId,
          recipientPhone: hashSuffix(recipient.phone),
          belowParCount: belowPar.data.length,
          cutoffCount: cutoffs.data.length,
        }),
      )
      return {
        sent: true,
        phone: recipient.phone,
        preview: message,
        recipientName: recipient.name,
      }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'nudge.send_failed',
          venueId,
          orgId,
          error: (err as Error).message,
        }),
      )
      return { sent: false, reason: `send failed: ${(err as Error).message}` }
    }
  }

  private async resolveRecipient(venueId: string): Promise<{ name: string; phone: string } | null> {
    // Priority: emergency contact → owner role → manager role → first phone-bearing contact.
    const contacts = await prisma.venueContact.findMany({
      where: { venueId, phone: { not: null } },
      select: { name: true, role: true, phone: true, isEmergencyContact: true },
      orderBy: [{ isEmergencyContact: 'desc' }, { role: 'asc' }],
    })
    const ranked = contacts.find((c) => c.isEmergencyContact && c.phone)
    if (ranked?.phone) return { name: ranked.name, phone: ranked.phone }
    const byRole = contacts.find(
      (c) =>
        c.phone &&
        (c.role.toLowerCase().includes('owner') ||
          c.role.toLowerCase().includes('manager') ||
          c.role.toLowerCase().includes('duty')),
    )
    if (byRole?.phone) return { name: byRole.name, phone: byRole.phone }
    const first = contacts.find((c) => c.phone)
    return first ? { name: first.name, phone: first.phone! } : null
  }

  private composeMessage(
    venueName: string,
    belowPar: Array<{ name: string; currentQty: unknown; parLevel: unknown; unit: string }>,
    cutoffs: Array<{ supplierName: string; supplierNotes?: string | null }>,
  ): string {
    const items = belowPar
      .slice(0, 6)
      .map((i) => `${i.name} (${formatNum(i.currentQty)}/${formatNum(i.parLevel)} ${i.unit})`)
      .join(', ')
    const moreSuffix = belowPar.length > 6 ? ` +${belowPar.length - 6} more` : ''
    const supplierLine = cutoffs
      .slice(0, 3)
      .map((c) => (c.supplierNotes ? `${c.supplierName} — ${c.supplierNotes}` : c.supplierName))
      .join('; ')

    return `Heads up at ${venueName}: ${belowPar.length} below par — ${items}${moreSuffix}. Cutoffs nearing: ${supplierLine}. Want me to draft the order? Reply yes.`
  }
}

function formatNum(v: unknown): string {
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && 'toString' in v) return String(v)
  return '?'
}

function hashSuffix(phone: string): string {
  return phone.slice(-4)
}
