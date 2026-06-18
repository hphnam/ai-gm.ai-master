import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ChatStartersController } from './chat-starters.controller'
import { ChatStartersGenerator } from './chat-starters.generator'
import { ChatStartersProcessor } from './chat-starters.processor'
import { CHAT_STARTERS_QUEUE_NAME } from './chat-starters.queue'
import { ChatStartersService } from './chat-starters.service'

/// Wave 3 — weekly rotating starter questions on the empty /chat page.
/// Owns a Redis cache (per-venue keys, 14-day TTL) populated by a BullMQ
/// weekly fanout. Falls back to a generic list on Redis miss or when the
/// classifier returns nothing usable.
@Module({
  imports: [BullModule.registerQueue({ name: CHAT_STARTERS_QUEUE_NAME })],
  controllers: [ChatStartersController],
  providers: [ChatStartersService, ChatStartersGenerator, ChatStartersProcessor],
  exports: [ChatStartersService],
})
export class ChatStartersModule {}
