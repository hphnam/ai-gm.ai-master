import { createHmac, timingSafeEqual } from 'crypto'
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { assertAuthEnv } from '../auth/assert-auth-env'

@Injectable()
export class WhatsappSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WhatsappSignatureGuard.name)

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    const body = (req?.body ?? {}) as Record<string, unknown>
    const sig = req?.headers?.['x-twilio-signature']
    const signaturePresent = typeof sig === 'string' && sig.length > 0

    const env = assertAuthEnv()
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const publicUrl = env.whatsapp?.webhookPublicUrl
    const allowDevBypass = env.whatsapp?.allowDevBypass === true

    // audit-added M7: reject malformed/duplicate-key forms before hashing.
    // Twilio always sends scalar strings; express.urlencoded({extended:false})
    // produces strings for scalars and arrays for duplicates.
    const bodyKeyCount = Object.keys(body).length
    for (const k of Object.keys(body)) {
      if (typeof body[k] !== 'string') {
        this.reject('malformed-params', signaturePresent, bodyKeyCount)
      }
    }

    // audit-added M2: dev-bypass — only when env flag ON + NODE_ENV!=production
    // (both checked at boot in assertAuthEnv) + no Twilio creds configured.
    if (
      allowDevBypass &&
      !authToken &&
      signaturePresent &&
      sig === 'probe-console'
    ) {
      this.logger.warn('whatsapp.signature_dev_bypass', {
        path: req?.path,
        allowDevBypass: true,
        nodeEnv: process.env.NODE_ENV,
      })
      return true
    }

    // audit-added M1: URL-pinned — NEVER derive from req headers.
    if (!publicUrl || !authToken) {
      this.reject('config-missing', signaturePresent, bodyKeyCount)
    }
    if (!signaturePresent) {
      this.reject('missing-signature', signaturePresent, bodyKeyCount)
    }

    const sortedKeys = Object.keys(body).sort()
    const signingString =
      publicUrl! + sortedKeys.map((k) => k + (body[k] as string)).join('')
    const expected = createHmac('sha1', authToken!)
      .update(signingString)
      .digest('base64')

    const sigBuf = Buffer.from(sig as string, 'utf8')
    const expBuf = Buffer.from(expected, 'utf8')
    if (sigBuf.length !== expBuf.length) {
      this.reject('length-mismatch', signaturePresent, bodyKeyCount)
    }
    if (!timingSafeEqual(sigBuf, expBuf)) {
      this.reject('hmac-mismatch', signaturePresent, bodyKeyCount)
    }

    return true
  }

  private reject(
    reason: string,
    signaturePresent: boolean,
    bodyKeyCount: number,
  ): never {
    this.logger.warn('whatsapp.signature_rejected', {
      reason,
      signaturePresent,
      bodyKeyCount,
    })
    throw new ForbiddenException({ error: 'signature-invalid' })
  }
}
