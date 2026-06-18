import { Module } from '@nestjs/common'
import { RealtimeModule } from '../realtime/realtime.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { PhoneController } from './phone.controller'
import { PhoneService } from './phone.service'
import { WhatsappVerifyService } from './whatsapp-verify.service'

@Module({
  imports: [WhatsappModule, RealtimeModule],
  controllers: [PhoneController],
  providers: [PhoneService, WhatsappVerifyService],
  exports: [],
})
export class PhoneModule {}
