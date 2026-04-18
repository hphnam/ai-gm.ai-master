import { Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { SuggestionsService } from './suggestions.service'

@Module({
  imports: [ChatModule],
  providers: [SuggestionsService],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
