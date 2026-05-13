import { Module } from '@nestjs/common'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { PhoneController } from './phone.controller'
import { PhoneService } from './phone.service'
import { WhatsappVerifyService } from './whatsapp-verify.service'

@Module({
  imports: [WhatsappModule],
  controllers: [PhoneController],
  providers: [PhoneService, WhatsappVerifyService],
  exports: [],
})
export class PhoneModule {}
