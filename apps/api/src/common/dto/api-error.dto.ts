import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { API_ERROR_CODES } from '../../types'

// Single source of truth for the API error envelope. Registered via
// @ApiExtraModels in AppModule so it lands in swagger.json's components,
// which lets orval emit the ApiErrorCode union and ApiErrorResponse type
// for the web side automatically (no hand-maintained mirror).
export const ApiErrorResponseSchema = z.object({
  error: z.enum(API_ERROR_CODES),
  details: z.unknown().optional(),
})
export class ApiErrorResponseDto extends createZodDto(ApiErrorResponseSchema) {}
