import { Module } from '@nestjs/common'
// Plan 06-04 Task 4 — WhatsApp consumer migrated from ChatModule (v1) to
// ChatV2Module. Inbound WhatsApp turns now flow through the multi-agent
// pipeline (Triage → Researchers → Analyser → Writer + optional Critic).
import { ChatV2Module } from '../chat-v2/chat-v2.module'
import { SuggestionsModule } from '../suggestions/suggestions.module'
import { WhatsAppAdapter } from './whatsapp.adapter'
import { WhatsappController } from './whatsapp.controller'
import { WhatsappService } from './whatsapp.service'
import { WhatsappSignatureGuard } from './whatsapp-signature.guard'

@Module({
  imports: [ChatV2Module, SuggestionsModule],
  providers: [WhatsAppAdapter, WhatsappService, WhatsappSignatureGuard],
  controllers: [WhatsappController],
  exports: [WhatsAppAdapter],
})
export class WhatsappModule {}
