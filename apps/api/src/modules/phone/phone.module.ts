import { Module } from '@nestjs/common'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { PhoneController } from './phone.controller'
import { PhoneService } from './phone.service'
import { InfobipVerifyService } from './infobip-verify.service'

@Module({
  imports: [WhatsappModule],
  controllers: [PhoneController],
  providers: [PhoneService, InfobipVerifyService],
  exports: [],
})
export class PhoneModule {}
