import { Module } from '@nestjs/common'
import { PhoneController } from './phone.controller'
import { PhoneService } from './phone.service'
import { TwilioVerifyService } from './twilio-verify.service'

@Module({
  controllers: [PhoneController],
  providers: [PhoneService, TwilioVerifyService],
  exports: [],
})
export class PhoneModule {}
