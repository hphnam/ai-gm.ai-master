import { Module } from '@nestjs/common'
import { MockOpsService } from './mock-ops.service'

@Module({
  providers: [MockOpsService],
  exports: [MockOpsService],
})
export class MockOpsModule {}
