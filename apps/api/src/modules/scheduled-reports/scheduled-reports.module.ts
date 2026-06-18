import { BullModule } from '@nestjs/bullmq'
import { forwardRef, Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ChatModule } from '../chat/chat.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { ReportsModule } from '../reports/reports.module'
import { ReportGeneratorService } from './report-generator.service'
import { ScheduledReportsController } from './scheduled-reports.controller'
import { ScheduledReportsProcessor } from './scheduled-reports.processor'
import { SCHEDULED_REPORTS_QUEUE_NAME } from './scheduled-reports.queue'
import { ScheduledReportsService } from './scheduled-reports.service'

@Module({
  imports: [
    BullModule.registerQueue({ name: SCHEDULED_REPORTS_QUEUE_NAME }),
    AuthModule,
    ReportsModule,
    RealtimeModule,
    // ChatModule provides ToolDispatcher (needed by ReportGeneratorService).
    // ChatModule also imports this module for ScheduledReportsService — break
    // the cycle with forwardRef on both sides.
    forwardRef(() => ChatModule),
  ],
  controllers: [ScheduledReportsController],
  providers: [ScheduledReportsService, ScheduledReportsProcessor, ReportGeneratorService],
  exports: [ScheduledReportsService],
})
export class ScheduledReportsModule {}
