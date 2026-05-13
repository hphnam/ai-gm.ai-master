import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { assertAuthEnv } from '../auth/assert-auth-env'

// 03-04 Infobip webhook signature verification.
// Source: Infobip WhatsApp API community patterns · verified against Infobip docs 2026-04-20
// UAT-VERIFY: header name + encoding assumptions confirmed on first live Portal UAT.
//
// Assumptions (plan audit M4 halt-condition reserved for discovered material drift):
//   - Scheme: HMAC-SHA256 over RAW request body bytes
//   - Secret: INFOBIP_WEBHOOK_SECRET (min 32 chars, enforced in assertAuthEnv)
//   - Header: `x-callback-signature` (Infobip common pattern; also tolerates `sha256=<hex>` prefix)
//   - Encoding: hex (lowercase); `Buffer.from(received, 'hex')` parses
//
// If UAT reveals materially different behavior: adjust SIGNATURE_HEADER / ENCODING below
// and update citations. Do NOT shotgun-patch — audit says halt + user review.
const SIGNATURE_HEADER = 'x-callback-signature'
const ENCODING: 'hex' | 'base64' = 'hex'

// 03-04 audit-added M3 (G3): signature format validation BEFORE Buffer.from to avoid
// silently parsing malformed input into truncated/empty buffers that could mask at timingSafeEqual.
const HEX_RE = /^[0-9a-fA-F]+$/
const BASE64_RE = /^[A-Za-z0-9+/=]+$/

@Injectable()
export class WhatsappSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WhatsappSignatureGuard.name)

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    const rawSig = req?.headers?.[SIGNATURE_HEADER]
    const signaturePresent = typeof rawSig === 'string' && rawSig.length > 0
    const rawBody: Buffer | undefined = req?.rawBody
    const bodyLen = rawBody?.length ?? 0

    const env = assertAuthEnv()
    const secret = env.infobip?.webhookSecret

    if (!secret) this.reject('config-missing', signaturePresent, bodyLen)
    if (!signaturePresent) this.reject('missing-signature', signaturePresent, bodyLen)
    if (!rawBody) this.reject('no-raw-body', signaturePresent, bodyLen)

    // Strip optional "sha256=" prefix (GitHub-style format; Infobip MAY use it).
    const received = (rawSig as string).startsWith('sha256=')
      ? (rawSig as string).slice(7)
      : (rawSig as string)

    // 03-04 audit M3: format regex BEFORE Buffer.from. A malformed hex string would silently
    // produce a truncated buffer and rely on length-check / timingSafeEqual to catch it —
    // reject explicitly with a distinct reason so ops can tell malformed-encoding apart
    // from hmac-mismatch.
    const formatRe = ENCODING === 'hex' ? HEX_RE : BASE64_RE
    if (!formatRe.test(received)) {
      this.reject('signature-malformed', signaturePresent, bodyLen)
    }

    const expected = createHmac('sha256', secret!).update(rawBody!).digest(ENCODING)

    const recBuf = Buffer.from(received, ENCODING)
    const expBuf = Buffer.from(expected, ENCODING)
    if (recBuf.length !== expBuf.length) this.reject('length-mismatch', signaturePresent, bodyLen)
    if (!timingSafeEqual(recBuf, expBuf)) this.reject('hmac-mismatch', signaturePresent, bodyLen)

    return true
  }

  private reject(reason: string, signaturePresent: boolean, bodyLen: number): never {
    this.logger.warn('whatsapp.signature_rejected', { reason, signaturePresent, bodyLen })
    throw new ForbiddenException({ error: 'signature-invalid' })
  }
}
