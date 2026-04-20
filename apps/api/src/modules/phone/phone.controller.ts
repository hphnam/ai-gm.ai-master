import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import {
  type ApiErrorResponse,
  type PhoneStatusResponse,
  type SendPhoneCodeBody,
  type SendPhoneCodeResponse,
  SendPhoneCodeBodySchema,
  VERIFY_CODE_TTL_SECONDS,
  type VerifyPhoneCodeBody,
  VerifyPhoneCodeBodySchema,
  type VerifyPhoneCodeResponse,
} from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/auth.decorators'
import { PhoneError, PhoneService } from './phone.service'
import { TwilioVerifyService } from './twilio-verify.service'

function mapPhoneError(
  code: PhoneError['code'],
  details?: unknown,
): HttpException {
  const body: ApiErrorResponse = { error: code, details }
  switch (code) {
    case 'phone-already-linked':
      return new ConflictException(body)
    case 'phone-change-requires-unlink':
      return new ConflictException(body)
    case 'phone-verification-failed':
      return new BadRequestException(body)
    case 'phone-rate-limited':
      return new HttpException(body, HttpStatus.TOO_MANY_REQUESTS)
    case 'phone-service-unavailable':
      return new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE)
    default: {
      const _exhaustive: never = code
      void _exhaustive
      return new HttpException(
        { error: 'not-found' } as ApiErrorResponse,
        HttpStatus.NOT_FOUND,
      )
    }
  }
}

@Controller('auth/phone')
export class PhoneController {
  private readonly logger = new Logger(PhoneController.name)

  constructor(
    private readonly service: PhoneService,
    private readonly twilio: TwilioVerifyService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async send(
    @Body(zodPipe(SendPhoneCodeBodySchema)) body: SendPhoneCodeBody,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SendPhoneCodeResponse> {
    const phoneHash = PhoneService.hashPhoneStatic(body.phoneNumber)
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
    const ipHash = PhoneService.hashIpStatic(ip)
    try {
      // audit-added M2: block silent number swap — require explicit unlink first.
      await this.service.assertNoExistingPhone(user.id)
      this.service.assertSendRateLimit(user.id, phoneHash, ipHash)
      const start = await this.twilio.startVerification(body.phoneNumber)
      if (!start.ok) {
        if (start.reason === 'phone-invalid-format') {
          const errBody: ApiErrorResponse = { error: 'phone-invalid-format' }
          throw new BadRequestException(errBody)
        }
        if (start.reason === 'phone-service-unavailable') {
          const errBody: ApiErrorResponse = {
            error: 'phone-service-unavailable',
            details: start.details,
          }
          throw new HttpException(errBody, HttpStatus.SERVICE_UNAVAILABLE)
        }
      }
      this.service.recordPendingVerification(user.id, body.phoneNumber)
      this.logger.log(
        JSON.stringify({
          event: 'phone.verify_sent',
          userId: user.id,
          phoneHash,
        }),
      )
      return { ok: true, expiresInSeconds: VERIFY_CODE_TTL_SECONDS }
    } catch (err) {
      if (err instanceof PhoneError) {
        // audit-added M8: Retry-After header on 429
        if (err.code === 'phone-rate-limited') {
          const retry =
            (err.details?.retryAfterSeconds as number | undefined) ?? 60
          res.setHeader('Retry-After', String(retry))
        }
        throw mapPhoneError(err.code, err.details)
      }
      throw err
    }
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async verify(
    @Body(zodPipe(VerifyPhoneCodeBodySchema)) body: VerifyPhoneCodeBody,
    @CurrentUser() user: { id: string },
  ): Promise<VerifyPhoneCodeResponse> {
    try {
      // audit-added M3: kill-switch precedes pending-match so a disabled-driver caller
      // sees 503 not 400 (observable distinction between abuse and outage).
      if (this.twilio.mode === 'disabled') {
        const errBody: ApiErrorResponse = {
          error: 'phone-service-unavailable',
          details: { reason: 'disabled' },
        }
        throw new HttpException(errBody, HttpStatus.SERVICE_UNAVAILABLE)
      }
      // audit-added M1: cross-session code-claim guard — requires pending entry for THIS user.
      this.service.assertPendingVerificationMatches(user.id, body.phoneNumber)
      const check = await this.twilio.checkVerification(
        body.phoneNumber,
        body.code,
      )
      if (!check.ok) {
        const errBody: ApiErrorResponse = {
          error: 'phone-service-unavailable',
          details: check.details,
        }
        throw new HttpException(errBody, HttpStatus.SERVICE_UNAVAILABLE)
      }
      if (!check.approved) {
        throw new PhoneError('phone-verification-failed')
      }
      const linked = await this.service.linkVerifiedNumber(
        user.id,
        body.phoneNumber,
      )
      this.service.consumePendingVerification(user.id)
      return {
        ok: true,
        phoneNumber: linked.phoneNumber,
        phoneVerifiedAt: linked.phoneVerifiedAt.toISOString(),
      }
    } catch (err) {
      if (err instanceof PhoneError) throw mapPhoneError(err.code, err.details)
      throw err
    }
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async unlink(@CurrentUser() user: { id: string }): Promise<{ ok: true }> {
    // audit-added M9: idempotent — no-op when nothing is linked; always 200.
    await this.service.unlinkNumber(user.id)
    return { ok: true }
  }

  @Get('status')
  @UseGuards(AuthGuard)
  async status(
    @CurrentUser() user: { id: string },
  ): Promise<PhoneStatusResponse> {
    return this.service.getStatus(user.id)
  }
}
