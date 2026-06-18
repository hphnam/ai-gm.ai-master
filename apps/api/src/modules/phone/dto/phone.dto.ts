import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { SendPhoneCodeBodySchema, VerifyPhoneCodeBodySchema } from '../../../types'

export class SendPhoneCodeBodyDto extends createZodDto(SendPhoneCodeBodySchema) {}
export class VerifyPhoneCodeBodyDto extends createZodDto(VerifyPhoneCodeBodySchema) {}

export const SendPhoneCodeResponseSchema = z.object({
  ok: z.literal(true),
  expiresInSeconds: z.number(),
})
export class SendPhoneCodeResponseDto extends createZodDto(SendPhoneCodeResponseSchema) {}

export const VerifyPhoneCodeResponseSchema = z.object({
  ok: z.literal(true),
  phoneNumber: z.string(),
  phoneVerifiedAt: z.string(),
})
export class VerifyPhoneCodeResponseDto extends createZodDto(VerifyPhoneCodeResponseSchema) {}

export const PhoneStatusResponseSchema = z.object({
  phoneNumber: z.string().nullable(),
  phoneVerifiedAt: z.string().nullable(),
})
export class PhoneStatusResponseDto extends createZodDto(PhoneStatusResponseSchema) {}

export const UnlinkPhoneResponseSchema = z.object({ ok: z.literal(true) })
export class UnlinkPhoneResponseDto extends createZodDto(UnlinkPhoneResponseSchema) {}
