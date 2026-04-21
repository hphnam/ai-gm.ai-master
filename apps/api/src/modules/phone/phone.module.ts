import { Module } from '@nestjs/common'
import { PhoneController } from './phone.controller'
import { PhoneService } from './phone.service'
import { InfobipVerifyService } from './infobip-verify.service'

@Module({
  controllers: [PhoneController],
  providers: [PhoneService, InfobipVerifyService],
  exports: [],
})
export class PhoneModule {}
