import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { assertAuthEnv } from '../auth/assert-auth-env'

// 03-06 Twilio webhook signature verification.
// Twilio's algorithm (https://www.twilio.com/docs/usage/webhooks/webhooks-security):
//   1. Build signing string = FULL_PUBLIC_URL + concat(sorted_params(k+v))
//   2. HMAC-SHA1 with TWILIO_AUTH_TOKEN as the key
//   3. base64 encode → compare to X-Twilio-Signature header (constant-time)
//
// Why PUBLIC_WEBHOOK_URL from env, not req.url?
//   Twilio signs the URL they were *given* in the console. A proxy in front
//   of us may rewrite host/scheme/path before NestJS sees the request.
//   Recomputing from req.url silently breaks signature validation behind any
//   tls-terminating proxy. Pinning to env keeps signing surface explicit.

const SIGNATURE_HEADER = 'x-twilio-signature'
const BASE64_RE = /^[A-Za-z0-9+/=]+$/

@Injectable()
export class TwilioSignatureGuard implements CanActivate {
  private readonly logger = new Logger(TwilioSignatureGuard.name)

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    const rawSig = req?.headers?.[SIGNATURE_HEADER]
    const signaturePresent = typeof rawSig === 'string' && rawSig.length > 0

    const env = assertAuthEnv()
    const token = env.twilio?.authToken
    const publicUrl = env.twilio?.publicWebhookUrl

    if (!token) this.reject('config-missing-token', signaturePresent)
    if (!publicUrl) this.reject('config-missing-url', signaturePresent)
    if (!signaturePresent) this.reject('missing-signature', signaturePresent)

    const received = rawSig as string
    if (!BASE64_RE.test(received)) {
      this.reject('signature-malformed', signaturePresent)
    }

    // Body is parsed form-encoded; collect into [key, value] string pairs.
    // Twilio's signing string = URL + concat(sorted_by_key(k + v)).
    // For multi-valued keys (e.g. Media{N}Url repeated), Twilio's published
    // helper concatenates each occurrence in the order they appear. Our body
    // parser flattens duplicates into arrays — if we see one, we concat in
    // array order to match Twilio's behavior.
    const body = (req?.body ?? {}) as Record<string, string | string[]>
    const keys = Object.keys(body).sort()
    let signingString = publicUrl!
    for (const k of keys) {
      const v = body[k]
      if (Array.isArray(v)) {
        for (const item of v) signingString += k + (item ?? '')
      } else {
        signingString += k + (v ?? '')
      }
    }

    const expected = createHmac('sha1', token!).update(signingString).digest('base64')

    const recBuf = Buffer.from(received, 'base64')
    const expBuf = Buffer.from(expected, 'base64')
    if (recBuf.length !== expBuf.length) this.reject('length-mismatch', signaturePresent)
    if (!timingSafeEqual(recBuf, expBuf)) this.reject('hmac-mismatch', signaturePresent)

    return true
  }

  private reject(reason: string, signaturePresent: boolean): never {
    this.logger.warn('whatsapp.signature_rejected', { reason, signaturePresent })
    throw new ForbiddenException({ error: 'signature-invalid' })
  }
}
