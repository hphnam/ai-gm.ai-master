import {
  ALLOWED_IMAGE_MIME_TYPES,
  DEFAULT_WHATSAPP_MEDIA_HOST_ALLOWLIST,
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
      ? envProd.split(',').map((s) => s.trim()).filter(Boolean)
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

// 03-04 audit-added S3 (G10): auth trial matrix for Infobip media URLs.
// Infobip docs don't clearly document whether media URLs are pre-signed (no auth) or
// require the App apiKey. This function tries App-header first; on 401/403 retries with
// no auth; if both fail returns media-download-failed with errorKind signaling the gap.
// Total wall-clock stays bounded by MEDIA_DOWNLOAD_TIMEOUT_MS shared across attempts.
async function fetchWithAuthTrial(
  url: string,
  apiKey: string,
  deadline: number,
): Promise<{ res: Response | null; authMode: 'app-key' | 'no-auth' | 'unknown'; errorKind?: string }> {
  const tryFetch = async (mode: 'app-key' | 'no-auth'): Promise<Response> => {
    const headers: Record<string, string> =
      mode === 'app-key' ? { Authorization: `App ${apiKey}` } : {}
    const remaining = Math.max(100, deadline - Date.now())
    return fetch(url, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(remaining),
    })
  }

  try {
    const first = await tryFetch('app-key')
    if (first.status !== 401 && first.status !== 403) {
      return { res: first, authMode: 'app-key' }
    }
    // 401/403 on App apiKey → retry without auth (Infobip may use pre-signed URLs).
    const second = await tryFetch('no-auth')
    if (second.status !== 401 && second.status !== 403) {
      return { res: second, authMode: 'no-auth' }
    }
    return {
      res: null,
      authMode: 'unknown',
      errorKind: `auth-trial-exhausted-app=${first.status}-noauth=${second.status}`,
    }
  } catch (err) {
    return {
      res: null,
      authMode: 'unknown',
      errorKind: (err as Error)?.constructor?.name ?? 'unknown',
    }
  }
}

export async function downloadWhatsappMedia(
  url: string,
  apiKey: string,
): Promise<MediaDownloadResult> {
  // 03-03 audit M1: SSRF gate BEFORE any fetch.
  const initial = isHostAllowed(url)
  if (!initial.allowed) {
    return { ok: false, reason: 'ssrf-rejected', errorKind: 'host-not-allowlisted' }
  }

  const deadline = Date.now() + MEDIA_DOWNLOAD_TIMEOUT_MS

  try {
    // Manual redirect follow with allowlist re-validation on every hop.
    let currentUrl = url
    let res: Response | null = null
    let authMode: 'app-key' | 'no-auth' | 'unknown' = 'unknown'
    let trialErrorKind: string | undefined

    for (let hop = 0; hop < 5; hop++) {
      const attempt = await fetchWithAuthTrial(currentUrl, apiKey, deadline)
      res = attempt.res
      authMode = attempt.authMode
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
        errorKind: `http-${res.status}-via-${authMode}`,
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
