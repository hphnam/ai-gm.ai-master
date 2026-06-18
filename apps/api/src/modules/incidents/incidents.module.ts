import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { IncidentsController } from './incidents.controller'
import { IncidentsService } from './incidents.service'

/// Incident triage. Reads from `incident_logs` (written by the chat
/// `log_incident` tool) and exposes a list + status workflow to owners and
/// managers. Also owns the fan-out notification that fires on each new
/// incident — kept here so the chat tool dispatcher doesn't have to know
/// about org-member queries or notification composition.
@Module({
  imports: [NotificationsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
