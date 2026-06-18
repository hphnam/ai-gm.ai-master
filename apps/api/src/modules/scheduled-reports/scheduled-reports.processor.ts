import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger, type OnApplicationBootstrap } from '@nestjs/common'
import type { Job, Queue } from 'bullmq'
import { prisma } from '../../database/prisma'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { ReportsService } from '../reports/reports.service'
import { ReportGeneratorService } from './report-generator.service'
import {
  SCHEDULED_REPORTS_JOB_FIRE,
  SCHEDULED_REPORTS_JOB_TICK,
  SCHEDULED_REPORTS_QUEUE_NAME,
  SCHEDULED_REPORTS_TICK_INTERVAL_MS,
  type ScheduledReportsFireJobData,
  type ScheduledReportsTickJobData,
} from './scheduled-reports.queue'
import { ScheduledReportsService } from './scheduled-reports.service'

const TICK_BATCH_SIZE = 50

/// Two job kinds:
///   - scheduled-reports.tick — repeatable every minute. Pulls due rows
///     (status='active' AND nextRunAt <= now()) and enqueues a per-row fire.
///   - scheduled-reports.fire — per-row work: write a placeholder Report,
///     stamp lastRunAt + nextRunAt + runCount, emit a Notification to the
///     creator. Phase C foundation only — content generation lands later.
///
/// `concurrency: 5` keeps fan-out modest. Tick batch caps at 50 so a backlog
/// (e.g. after a worker outage) doesn't stampede the report-create path.
///
/// MAX_FIRES_PER_ORG bounds concurrent agent runs PER tenant — without this
/// a single org with 50 daily schedules aligning to the same wall-clock
/// (e.g. all "Mon 09:00") could legitimately spawn 5 concurrent Anthropic
/// calls in one cadence window, multiplied across other orgs at the same
/// hour. Cap is in-memory (single-node OK; revisit for horizontal scale).
const MAX_FIRES_PER_ORG = 2
@Processor(SCHEDULED_REPORTS_QUEUE_NAME, { concurrency: 5 })
export class ScheduledReportsProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduledReportsProcessor.name)
  /// Per-org in-flight counter. Map key = orgId, value = number of fires
  /// currently running. Decremented in the finally of handleFire.
  private readonly inFlightByOrg = new Map<string, number>()

  constructor(
    private readonly schedules: ScheduledReportsService,
    private readonly reports: ReportsService,
    private readonly realtime: RealtimeGateway,
    private readonly generator: ReportGeneratorService,
    @InjectQueue(SCHEDULED_REPORTS_QUEUE_NAME) private readonly queue: Queue,
  ) {
    super()
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SCHEDULED_REPORTS_CRON_DISABLED === '1') {
      this.logger.log('scheduled-reports cron disabled via SCHEDULED_REPORTS_CRON_DISABLED')
      return
    }
    // Wipe any stale repeatable from previous runs so a config change to
    // SCHEDULED_REPORTS_TICK_INTERVAL_MS takes effect on next deploy.
    const existing = await this.queue.getRepeatableJobs()
    for (const r of existing) {
      if (r.name === SCHEDULED_REPORTS_JOB_TICK) {
        await this.queue.removeRepeatableByKey(r.key)
      }
    }
    await this.queue.add(
      SCHEDULED_REPORTS_JOB_TICK,
      {
        triggeredAt: new Date().toISOString(),
        reason: 'cron',
      } satisfies ScheduledReportsTickJobData,
      {
        repeat: { every: SCHEDULED_REPORTS_TICK_INTERVAL_MS },
        jobId: SCHEDULED_REPORTS_JOB_TICK,
        removeOnComplete: 50,
        removeOnFail: 25,
      },
    )
    this.logger.log(
      `scheduled-reports tick scheduled every ${SCHEDULED_REPORTS_TICK_INTERVAL_MS / 1000}s`,
    )
  }

  async process(job: Job): Promise<void> {
    if (job.name === SCHEDULED_REPORTS_JOB_TICK) {
      await this.handleTick()
      return
    }
    if (job.name === SCHEDULED_REPORTS_JOB_FIRE) {
      const data = job.data as ScheduledReportsFireJobData
      await this.handleFire(data.scheduledReportId)
      return
    }
    this.logger.warn(`unknown job ${job.name}`)
  }

  private async handleTick(): Promise<void> {
    // claimDue advances each row's nextRunAt forward INSIDE the same
    // transaction it reads from, so a slow fire can't be re-picked by the
    // next tick. The jobId dedupe on add() is now belt-and-braces.
    const due = await this.schedules.claimDue(new Date(), TICK_BATCH_SIZE)
    if (due.length === 0) return
    this.logger.log(JSON.stringify({ event: 'scheduled-reports.tick.due', count: due.length }))
    for (const row of due) {
      await this.queue.add(
        SCHEDULED_REPORTS_JOB_FIRE,
        { scheduledReportId: row.id } satisfies ScheduledReportsFireJobData,
        {
          // Use the schedule id as the BullMQ job id so multiple ticks landing
          // close together don't enqueue dupes for the same row.
          jobId: `${SCHEDULED_REPORTS_JOB_FIRE}:${row.id}`,
          removeOnComplete: 100,
          removeOnFail: 25,
        },
      )
    }
  }

  private async handleFire(scheduledReportId: string): Promise<void> {
    // Re-read the row inside the worker so a paused/cancelled state since
    // the tick enqueued is honoured.
    const schedule = await prisma.scheduledReport.findUnique({
      where: { id: scheduledReportId },
      select: {
        id: true,
        organizationId: true,
        venueId: true,
        createdByUserId: true,
        title: true,
        summary: true,
        status: true,
        prompt: true,
      },
    })
    if (!schedule) {
      this.logger.warn(`fire skipped: schedule ${scheduledReportId} not found`)
      return
    }
    // Per-org concurrency gate. If this tenant already has MAX_FIRES_PER_ORG
    // fires running, re-enqueue this job for the next tick window. BullMQ
    // backoff is 30s — well under the 60s tick cadence, so the job rejoins
    // the next claim cycle without losing the slot. nextRunAt was already
    // advanced in claimDue so we won't double-fire.
    const inFlight = this.inFlightByOrg.get(schedule.organizationId) ?? 0
    if (inFlight >= MAX_FIRES_PER_ORG) {
      this.logger.log(
        JSON.stringify({
          event: 'scheduled-reports.fire.deferred',
          scheduledReportId,
          orgId: schedule.organizationId,
          inFlight,
        }),
      )
      await this.queue.add(
        SCHEDULED_REPORTS_JOB_FIRE,
        { scheduledReportId } satisfies ScheduledReportsFireJobData,
        {
          delay: 30_000,
          jobId: `${SCHEDULED_REPORTS_JOB_FIRE}:${scheduledReportId}:retry-${Date.now()}`,
          removeOnComplete: 100,
          removeOnFail: 25,
        },
      )
      return
    }
    this.inFlightByOrg.set(schedule.organizationId, inFlight + 1)
    try {
      await this.runFire(schedule, scheduledReportId)
    } finally {
      const after = (this.inFlightByOrg.get(schedule.organizationId) ?? 1) - 1
      if (after <= 0) this.inFlightByOrg.delete(schedule.organizationId)
      else this.inFlightByOrg.set(schedule.organizationId, after)
    }
  }

  private async runFire(
    schedule: {
      id: string
      organizationId: string
      venueId: string | null
      createdByUserId: string | null
      title: string
      summary: string | null
      status: string
      prompt: string | null
    },
    scheduledReportId: string,
  ): Promise<void> {
    if (schedule.status !== 'active') {
      this.logger.log(`fire skipped: schedule ${scheduledReportId} status=${schedule.status}`)
      return
    }
    if (!schedule.createdByUserId) {
      this.logger.log(`fire skipped: schedule ${scheduledReportId} has no creator (user removed)`)
      // Still stamp lastRunAt so the row doesn't look stuck. nextRunAt was
      // already advanced in claimDue.
      await this.schedules.recordFire({
        id: scheduledReportId,
        organizationId: schedule.organizationId,
        reportId: null,
        firedAt: new Date(),
      })
      return
    }

    const firedAt = new Date()
    let reportId: string | null = null
    try {
      // Headless agent run: builds the same agent the chat path uses, lets
      // it call data tools (pos_*, find_knowledge, compare_periods, …) and
      // emit a ReportSpec via generate_report. The Report row is created
      // inside that tool dispatch — we capture the id via the generator's
      // onStepFinish callback.
      const gen = await this.generator.generate({
        scheduleId: schedule.id,
        orgId: schedule.organizationId,
        userId: schedule.createdByUserId,
        venueId: schedule.venueId,
        title: schedule.title,
        summary: schedule.summary,
        prompt: schedule.prompt,
      })
      reportId = gen.reportId

      // Fallback path: agent didn't call generate_report, timed out, or the
      // tool errored. Write a single-section text report so the cadence slot
      // isn't silently lost and the user can re-run in chat.
      if (!reportId) {
        const firedAtLabel = firedAt.toLocaleString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        })
        const body = `We couldn't pull the numbers for this run automatically. Open it in chat to try again.\n\n_Attempted ${firedAtLabel} UTC._`
        const fallback = await this.reports.create({
          orgId: schedule.organizationId,
          userId: schedule.createdByUserId,
          venueId: schedule.venueId,
          title: schedule.title,
          summary: schedule.summary,
          spec: { version: 1, sections: [{ type: 'text', body }] },
        })
        reportId = fallback.id
        this.logger.warn(
          JSON.stringify({
            event: 'scheduled-reports.fire.fallback',
            scheduledReportId,
            failure: gen.failure,
            reportId,
          }),
        )
      }

      // Notify the creator with a clickable Markdown link to the report.
      // Strip `[]()` from the title so it can't smuggle a fake link target
      // through the restricted Markdown renderer.
      const safeTitle = schedule.title.replace(/[[\]()]/g, '')
      const notifBody = `Your scheduled report "[${safeTitle}](/reports/${reportId})" is ready.`
      const notif = await prisma.notification.create({
        data: {
          organizationId: schedule.organizationId,
          recipientUserId: schedule.createdByUserId,
          authorUserId: null,
          source: 'manual',
          category: 'report',
          // System-authored is automated by definition.
          automated: true,
          // Reference lets the alerts row offer "Open report" without parsing
          // the markdown link out of the body (which is also kept for older
          // clients that pre-date the structured field).
          referenceKind: reportId ? 'report' : null,
          referenceId: reportId,
          body: notifBody,
        },
        select: {
          id: true,
          createdAt: true,
          recipient: { select: { id: true, name: true, email: true } },
        },
      })
      // System-authored: only the recipient gets the event.
      this.realtime.emitNotificationCreated(schedule.createdByUserId, {
        kind: 'received',
        id: notif.id,
        body: notifBody,
        source: 'manual',
        category: 'report',
        automated: true,
        reference: reportId ? { kind: 'report', id: reportId } : null,
        createdAt: notif.createdAt.toISOString(),
        author: null,
        recipient: {
          id: notif.recipient.id,
          name: notif.recipient.name,
          email: notif.recipient.email,
        },
      })
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          event: 'scheduled-reports.fire.error',
          scheduledReportId,
          message: (err as Error).message,
        }),
      )
      // Still advance nextRunAt so a single bad row doesn't block the queue.
    }

    await this.schedules.recordFire({
      id: scheduledReportId,
      organizationId: schedule.organizationId,
      reportId,
      firedAt,
    })
  }
}
