import {
  ALLOWED_IMAGE_MIME_TYPES,
  DEFAULT_TWILIO_MEDIA_HOST_ALLOWLIST,
  MAX_IMAGE_DOWNLOAD_BYTES,
  MEDIA_DOWNLOAD_TIMEOUT_MS,
  type AllowedImageMimeType,
} from '@gm-ai/types'

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

// SSRF defense (audit M1): validate URL host against an allowlist BEFORE any network call.
//   - Production: TWILIO_MEDIA_HOST_ALLOWLIST env (comma-separated; falls back to DEFAULT)
//   - Probe-only: PROBE_MEDIA_HOST_ALLOWLIST env (additive; ONLY when NODE_ENV !== 'production')
// Wildcards via `*.suffix` (suffix match). Ports included in host comparison.
export function isHostAllowed(urlString: string): { allowed: boolean; host: string } {
  let host = ''
  try {
    host = new URL(urlString).host
  } catch {
    return { allowed: false, host: '' }
  }
  const envProd = process.env.TWILIO_MEDIA_HOST_ALLOWLIST
  const prod = envProd !== undefined && envProd.length > 0
    ? envProd.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_TWILIO_MEDIA_HOST_ALLOWLIST
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

// Magic-byte validator (audit M3): declared MIME must match actual byte signature.
function magicByteMatchesMime(bytes: Uint8Array, declaredMime: string): boolean {
  if (bytes.length < 12) return false
  const b = bytes
  switch (declaredMime) {
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    case 'image/png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    case 'image/gif':
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38
    case 'image/webp':
      return (
        b[0] === 0x52 &&
        b[1] === 0x49 &&
        b[2] === 0x46 &&
        b[3] === 0x46 &&
        b[8] === 0x57 &&
        b[9] === 0x45 &&
        b[10] === 0x42 &&
        b[11] === 0x50
      )
    default:
      return false
  }
}

function isAllowedMime(mime: string): mime is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
}

export async function downloadTwilioMedia(
  url: string,
  accountSid: string,
  authToken: string,
): Promise<MediaDownloadResult> {
  // audit M1: SSRF gate BEFORE any fetch.
  const initial = isHostAllowed(url)
  if (!initial.allowed) {
    return { ok: false, reason: 'ssrf-rejected', errorKind: 'host-not-allowlisted' }
  }

  const basic = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const headers = {
    Authorization: `Basic ${basic}`,
  }

  try {
    // Manual redirect follow so the redirect target gets re-validated through isHostAllowed.
    // Twilio responds with 302 → S3; both hops must pass the allowlist.
    let currentUrl = url
    let res: Response | null = null
    for (let hop = 0; hop < 5; hop++) {
      res = await fetch(currentUrl, {
        method: 'GET',
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(MEDIA_DOWNLOAD_TIMEOUT_MS),
      })
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
      return { ok: false, reason: 'media-download-failed', errorKind: 'no-response' }
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: 'media-download-failed',
        status: res.status,
        errorKind: `http-${res.status}`,
      }
    }

    // audit M2: MIME allowlist check BEFORE reading body.
    const declaredMime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!declaredMime) {
      return { ok: false, reason: 'unsupported-mime', mediaType: '' }
    }
    if (!isAllowedMime(declaredMime)) {
      return { ok: false, reason: 'unsupported-mime', mediaType: declaredMime }
    }

    // audit M4: streaming byte counter (don't trust Content-Length alone).
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

    // audit M3: magic-byte signature validation post-download.
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
