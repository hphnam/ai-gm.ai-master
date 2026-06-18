import { Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { SuggestionsController } from './suggestions.controller'
import { SuggestionsService } from './suggestions.service'

@Module({
  imports: [ChatModule],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
