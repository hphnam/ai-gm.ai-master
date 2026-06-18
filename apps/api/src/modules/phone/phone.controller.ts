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
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { type ApiErrorResponse, VERIFY_CODE_TTL_SECONDS } from '../../types'
import { CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import {
  PhoneStatusResponseDto,
  SendPhoneCodeBodyDto,
  SendPhoneCodeResponseDto,
  UnlinkPhoneResponseDto,
  VerifyPhoneCodeBodyDto,
  VerifyPhoneCodeResponseDto,
} from './dto/phone.dto'
import { PhoneError, PhoneService } from './phone.service'
import { WhatsappVerifyService } from './whatsapp-verify.service'

function mapPhoneError(code: PhoneError['code'], details?: unknown): HttpException {
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
      return new HttpException({ error: 'not-found' } as ApiErrorResponse, HttpStatus.NOT_FOUND)
    }
  }
}

@ApiTags('phone')
@ApiBearerAuth()
@Controller('auth/phone')
export class PhoneController {
  private readonly logger = new Logger(PhoneController.name)

  constructor(
    private readonly service: PhoneService,
    private readonly verifier: WhatsappVerifyService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: SendPhoneCodeResponseDto })
  async send(
    @Body() body: SendPhoneCodeBodyDto,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SendPhoneCodeResponseDto> {
    const phoneHash = PhoneService.hashPhoneStatic(body.phoneNumber)
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
    const ipHash = PhoneService.hashIpStatic(ip)
    // audit-S4: propagate HTTP X-Request-Id into service-layer logs for send→verify correlation
    const requestId = req.header('x-request-id') ?? undefined
    try {
      // audit-added M2: block silent number swap — require explicit unlink first.
      await this.service.assertNoExistingPhone(user.id)
      this.service.assertSendRateLimit(user.id, phoneHash, ipHash)
      const start = await this.verifier.startVerification(body.phoneNumber, { requestId })
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
      return { ok: true, expiresInSeconds: VERIFY_CODE_TTL_SECONDS } as SendPhoneCodeResponseDto
    } catch (err) {
      if (err instanceof PhoneError) {
        // audit-added M8: Retry-After header on 429
        if (err.code === 'phone-rate-limited') {
          const retry = (err.details?.retryAfterSeconds as number | undefined) ?? 60
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
  @ApiResponse({ status: 200, type: VerifyPhoneCodeResponseDto })
  async verify(
    @Body() body: VerifyPhoneCodeBodyDto,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ): Promise<VerifyPhoneCodeResponseDto> {
    // audit-S4: propagate HTTP X-Request-Id into service-layer logs for send→verify correlation
    const requestId = req.header('x-request-id') ?? undefined
    try {
      // PHONE_VERIFY_DRIVER_OVERRIDE kill-switch precedes pending-match so a disabled-driver
      // caller sees 503 not 400 (observable distinction between abuse and outage).
      if (this.verifier.mode === 'disabled') {
        const errBody: ApiErrorResponse = {
          error: 'phone-service-unavailable',
          details: { reason: 'disabled' },
        }
        throw new HttpException(errBody, HttpStatus.SERVICE_UNAVAILABLE)
      }
      // audit-added M1: cross-session code-claim guard — requires pending entry for THIS user.
      this.service.assertPendingVerificationMatches(user.id, body.phoneNumber)
      const check = await this.verifier.checkVerification(body.phoneNumber, body.code, {
        requestId,
      })
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
      const linked = await this.service.linkVerifiedNumber(user.id, body.phoneNumber)
      this.service.consumePendingVerification(user.id)
      return {
        ok: true,
        phoneNumber: linked.phoneNumber,
        phoneVerifiedAt: linked.phoneVerifiedAt.toISOString(),
      } as VerifyPhoneCodeResponseDto
    } catch (err) {
      if (err instanceof PhoneError) throw mapPhoneError(err.code, err.details)
      throw err
    }
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: UnlinkPhoneResponseDto })
  async unlink(@CurrentUser() user: { id: string }): Promise<UnlinkPhoneResponseDto> {
    // audit-added M9: idempotent — no-op when nothing is linked; always 200.
    await this.service.unlinkNumber(user.id)
    return { ok: true } as UnlinkPhoneResponseDto
  }

  @Get('status')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: PhoneStatusResponseDto })
  async status(@CurrentUser() user: { id: string }): Promise<PhoneStatusResponseDto> {
    return this.service.getStatus(user.id) as Promise<PhoneStatusResponseDto>
  }
}
