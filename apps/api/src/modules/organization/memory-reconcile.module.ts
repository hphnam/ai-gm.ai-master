import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { MemoryReconcileProcessor } from './memory-reconcile.processor'
import { MEMORY_RECONCILE_QUEUE_NAME } from './memory-reconcile.queue'
import { MemoryReconcileService } from './memory-reconcile.service'
import { MemoryReconcileTrigger } from './memory-reconcile.trigger'

/// Keeps per-org agent memory consistent with the knowledge base via a nightly
/// fanout + a debounced KB-change trigger. Exports the trigger so the docs
/// layer can poke it when a doc goes ready / superseded.
@Module({
  imports: [BullModule.registerQueue({ name: MEMORY_RECONCILE_QUEUE_NAME })],
  providers: [MemoryReconcileService, MemoryReconcileProcessor, MemoryReconcileTrigger],
  exports: [MemoryReconcileTrigger],
})
export class MemoryReconcileModule {}
