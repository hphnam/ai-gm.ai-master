import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
// Plan 06-04 Task 4 — WhatsApp consumer migrated from ChatModule (v1) to
// ChatCoreModule. Inbound WhatsApp turns now flow through the multi-agent
// pipeline (Triage → Researchers → Analyser → Writer + optional Critic).
import { ChatCoreModule } from '../chat-core/chat-core.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { SuggestionsModule } from '../suggestions/suggestions.module'
import { InviteController, InviteRedeemController } from './invite.controller'
// Phase 03-01 — identity binding + onboarding flow services + manager API.
import { InviteService } from './invite.service'
import { TwilioController } from './twilio.controller'
import { TwilioSignatureGuard } from './twilio-signature.guard'
import { WhatsAppAdapter } from './whatsapp.adapter'
import { WhatsappService } from './whatsapp.service'
import { WhatsappOnboardingService } from './whatsapp-onboarding.service'
import { WhatsappOtpService } from './whatsapp-otp.service'

@Module({
  imports: [ChatCoreModule, SuggestionsModule, AuthModule, RealtimeModule],
  providers: [
    WhatsAppAdapter,
    WhatsappService,
    TwilioSignatureGuard,
    InviteService,
    WhatsappOtpService,
    WhatsappOnboardingService,
  ],
  controllers: [TwilioController, InviteController, InviteRedeemController],
  exports: [WhatsAppAdapter, InviteService, WhatsappOtpService, WhatsappOnboardingService],
})
export class WhatsappModule {}
