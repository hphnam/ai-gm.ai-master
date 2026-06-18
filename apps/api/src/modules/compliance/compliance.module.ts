import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { RealtimeModule } from '../realtime/realtime.module'
import { TasksModule } from '../tasks/tasks.module'
import { ComplianceController } from './compliance.controller'
import { ComplianceService } from './compliance.service'
import { ExpiryExtractorService } from './expiry-extractor.service'
import { ExpirySchedulerProcessor } from './expiry-scheduler.processor'
import { EXPIRY_SCHEDULER_QUEUE_NAME } from './expiry-scheduler.queue'
import { ExpirySchedulerService } from './expiry-scheduler.service'

/// Wave 2 — Compliance & Expiry Radar. Three subsystems live here together
/// because they all read/write the same ExpiryRecord table and the coupling
/// is tight: extractor populates records, scheduler reads them, controller
/// exposes both. The extractor is exported so IngestModule can wire it into
/// the upload pipeline post-persist.
@Module({
  imports: [
    RealtimeModule,
    TasksModule,
    BullModule.registerQueue({ name: EXPIRY_SCHEDULER_QUEUE_NAME }),
  ],
  controllers: [ComplianceController],
  providers: [
    ComplianceService,
    ExpiryExtractorService,
    ExpirySchedulerService,
    ExpirySchedulerProcessor,
  ],
  exports: [ComplianceService, ExpiryExtractorService],
})
export class ComplianceModule {}
