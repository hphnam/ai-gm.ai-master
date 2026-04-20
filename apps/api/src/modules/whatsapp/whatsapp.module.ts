import { Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { WhatsAppAdapter } from './whatsapp.adapter'
import { WhatsappController } from './whatsapp.controller'
import { WhatsappService } from './whatsapp.service'
import { WhatsappSignatureGuard } from './whatsapp-signature.guard'

@Module({
  imports: [ChatModule],
  providers: [WhatsAppAdapter, WhatsappService, WhatsappSignatureGuard],
  controllers: [WhatsappController],
  exports: [WhatsAppAdapter],
})
export class WhatsappModule {}
