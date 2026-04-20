import { Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { SuggestionsModule } from '../suggestions/suggestions.module'
import { WhatsAppAdapter } from './whatsapp.adapter'
import { WhatsappController } from './whatsapp.controller'
import { WhatsappService } from './whatsapp.service'
import { WhatsappSignatureGuard } from './whatsapp-signature.guard'

@Module({
  imports: [ChatModule, SuggestionsModule],
  providers: [WhatsAppAdapter, WhatsappService, WhatsappSignatureGuard],
  controllers: [WhatsappController],
  exports: [WhatsAppAdapter],
})
export class WhatsappModule {}
