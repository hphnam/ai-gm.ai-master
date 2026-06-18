import { magicByteMatchesMime } from '../../common/image-magic-bytes'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  type AllowedImageMimeType,
  DEFAULT_WHATSAPP_MEDIA_HOST_ALLOWLIST,
  MAX_IMAGE_DOWNLOAD_BYTES,
  MEDIA_DOWNLOAD_TIMEOUT_MS,
} from '../../types'

export type MediaDownloadResult =
  | { ok: true; base64: string; mediaType: AllowedImageMimeType; byteSize: number }
  | {
      ok: false
      reason:
        | 'media-download-failed'
        | 'media-too-large'
        | 'ssrf-rejected'
        | 'unsupported-mime'
        | 'media-content-mismatch'
      status?: number
      errorKind?: string
      mediaType?: string
    }

// 03-04 Infobip migration — SSRF defense (03-03 audit M1): validate URL host against allowlist
// BEFORE any network call.
//   - Production: WHATSAPP_MEDIA_HOST_ALLOWLIST env (comma-separated; falls back to DEFAULT)
//   - Probe-only: PROBE_MEDIA_HOST_ALLOWLIST env (additive; ONLY when NODE_ENV !== 'production')
// Wildcards via `*.suffix` (suffix match). Ports included in host comparison.
export function isHostAllowed(urlString: string): { allowed: boolean; host: string } {
  let host = ''
  try {
    host = new URL(urlString).host
  } catch {
    return { allowed: false, host: '' }
  }
  const envProd = process.env.WHATSAPP_MEDIA_HOST_ALLOWLIST
  const prod =
    envProd !== undefined && envProd.length > 0
      ? envProd
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : DEFAULT_WHATSAPP_MEDIA_HOST_ALLOWLIST
  const probe =
    process.env.NODE_ENV !== 'production'
      ? (process.env.PROBE_MEDIA_HOST_ALLOWLIST ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  const all = [...prod, ...probe]
  const match = all.some((p) => (p.startsWith('*.') ? host.endsWith(p.slice(1)) : host === p))
  return { allowed: match, host }
}

// Magic-byte validator (03-03 audit M3): declared MIME must match actual byte signature.
// Plan 04-01 Task 3: factored to apps/api/src/common/image-magic-bytes.ts for docs reuse.

function isAllowedMime(mime: string): mime is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
}

// 03-06 Twilio media auth: media URLs returned by Twilio webhook
// (MediaUrl{N}) require Basic auth = base64(accountSid:authToken). The first
// request returns a redirect to a signed S3 URL which does NOT require auth.
// Manual redirect handling preserves SSRF allowlist re-validation; we only
// send the Authorization header on the first hop to avoid leaking creds to S3.
async function fetchWithBasicAuthFirstHop(
  url: string,
  basicAuth: string,
  deadline: number,
  isFirstHop: boolean,
): Promise<{ res: Response | null; errorKind?: string }> {
  try {
    const headers: Record<string, string> = isFirstHop
      ? { Authorization: `Basic ${basicAuth}` }
      : {}
    const remaining = Math.max(100, deadline - Date.now())
    const res = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(remaining),
    })
    return { res }
  } catch (err) {
    return {
      res: null,
      errorKind: (err as Error)?.constructor?.name ?? 'unknown',
    }
  }
}

export async function downloadWhatsappMedia(
  url: string,
  basicAuth: string,
): Promise<MediaDownloadResult> {
  // 03-03 audit M1: SSRF gate BEFORE any fetch.
  const initial = isHostAllowed(url)
  if (!initial.allowed) {
    return { ok: false, reason: 'ssrf-rejected', errorKind: 'host-not-allowlisted' }
  }

  const deadline = Date.now() + MEDIA_DOWNLOAD_TIMEOUT_MS

  try {
    let currentUrl = url
    let res: Response | null = null
    let trialErrorKind: string | undefined

    for (let hop = 0; hop < 5; hop++) {
      const attempt = await fetchWithBasicAuthFirstHop(currentUrl, basicAuth, deadline, hop === 0)
      res = attempt.res
      trialErrorKind = attempt.errorKind
      if (!res) break

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) {
          return {
            ok: false,
            reason: 'media-download-failed',
            status: res.status,
            errorKind: 'redirect-no-location',
          }
        }
        const nextUrl = new URL(loc, currentUrl).toString()
        const check = isHostAllowed(nextUrl)
        if (!check.allowed) {
          return { ok: false, reason: 'ssrf-rejected', errorKind: 'redirect-host-not-allowlisted' }
        }
        currentUrl = nextUrl
        continue
      }
      break
    }

    if (!res) {
      return {
        ok: false,
        reason: 'media-download-failed',
        errorKind: trialErrorKind ?? 'no-response',
      }
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: 'media-download-failed',
        status: res.status,
        errorKind: `http-${res.status}`,
      }
    }

    // 03-03 audit M2: MIME allowlist check BEFORE reading body.
    const declaredMime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!declaredMime) {
      return { ok: false, reason: 'unsupported-mime', mediaType: '' }
    }
    if (!isAllowedMime(declaredMime)) {
      return { ok: false, reason: 'unsupported-mime', mediaType: declaredMime }
    }

    // 03-03 audit M4: streaming byte counter (don't trust Content-Length alone).
    const body = res.body
    if (!body) {
      return { ok: false, reason: 'media-download-failed', errorKind: 'no-body-stream' }
    }
    const reader = body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > MAX_IMAGE_DOWNLOAD_BYTES) {
        try {
          await reader.cancel()
        } catch {}
        return { ok: false, reason: 'media-too-large' }
      }
      chunks.push(value)
    }
    const bytes = Buffer.concat(chunks)

    // 03-03 audit M3: magic-byte signature validation post-download.
    if (!magicByteMatchesMime(bytes, declaredMime)) {
      return { ok: false, reason: 'media-content-mismatch', mediaType: declaredMime }
    }

    return {
      ok: true,
      base64: bytes.toString('base64'),
      mediaType: declaredMime,
      byteSize: bytes.length,
    }
  } catch (err) {
    return {
      ok: false,
      reason: 'media-download-failed',
      errorKind: (err as Error)?.constructor?.name ?? 'unknown',
    }
  }
}
