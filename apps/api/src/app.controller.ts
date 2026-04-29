import { Controller, Get } from '@nestjs/common'
import { type HealthCheck } from './types'

@Controller()
export class AppController {
  @Get()
  getHealth(): HealthCheck {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
