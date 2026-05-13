import { Controller, Get } from '@nestjs/common'
import { ApiExtraModels } from '@nestjs/swagger'
import { ApiErrorResponseDto } from './common/dto/api-error.dto'
import type { HealthCheck } from './types'

// ApiExtraModels registers DTOs with swagger that aren't directly used
// in @ApiResponse decorators — the error envelope is the single source
// of truth for ApiErrorCode (orval picks it up from components.schemas).
@ApiExtraModels(ApiErrorResponseDto)
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
