import { BadRequestException, type HttpException, NotFoundException } from '@nestjs/common'
import type { ApiErrorResponse } from '../types'

export function translateChatServiceError(err: Error): HttpException | null {
  const msg = err.message ?? ''

  if (/venue .* not found/i.test(msg)) {
    const body: ApiErrorResponse = { error: 'venue-not-found' }
    return new NotFoundException(body)
  }

  if (/conversation .* does not belong to venue/i.test(msg)) {
    const body: ApiErrorResponse = {
      error: 'invalid-input',
      details: 'conversation-venue-mismatch',
    }
    return new BadRequestException(body)
  }

  if (/conversation .* not found/i.test(msg)) {
    const body: ApiErrorResponse = { error: 'conversation-not-found' }
    return new NotFoundException(body)
  }

  if (/invalid sendMessage input/i.test(msg)) {
    const body: ApiErrorResponse = { error: 'invalid-input' }
    return new BadRequestException(body)
  }

  return null
}
