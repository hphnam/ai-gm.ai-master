// Plan 06-04 Task 1 — multimodal attachment validator.
//
// Mirrors the Phase 4 04-01 4-layer validation contract:
//   1. MIME allowlist (image/jpeg|png|webp|gif)
//   2. declared-MIME ↔ magic-byte signature match (re-uses the shared helper at
//      apps/api/src/common/image-magic-bytes.ts — do NOT fork)
//   3. MAX_IMAGE_BYTES_BY_MIME ceiling (5MB hard cap, matches chat-v1 behavior)
//   4. Multer per-request 15MB outer cap (configured at FileInterceptor level)
//
// The validator is intentionally pure (no NestJS DI) so it can be called
// directly from chat-core.controller.ts and unit-tested without bootstrapping
// the module graph.

import { magicByteMatchesMime } from '../../common/image-magic-bytes'

export const MAX_IMAGE_BYTES = 5_242_880 // 5MB

export type AttachmentMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

export type ValidatedAttachment = {
  mediaType: AttachmentMime
  base64: string
  byteLength: number
}

export type ValidationResult =
  | { ok: true; attachment: ValidatedAttachment }
  | { ok: false; reason: 'unsupported-mime' | 'corrupt-bytes' | 'payload-too-large' }

const ALLOWED_MIMES: ReadonlySet<string> = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export function validateMultimodalAttachment(
  file: Express.Multer.File | undefined,
): ValidationResult {
  if (!file) return { ok: false, reason: 'unsupported-mime' }
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    return { ok: false, reason: 'unsupported-mime' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'payload-too-large' }
  }
  // Magic-byte signature gate (Phase 4 04-01 hardening — shared helper).
  if (!magicByteMatchesMime(new Uint8Array(file.buffer), file.mimetype)) {
    return { ok: false, reason: 'corrupt-bytes' }
  }
  return {
    ok: true,
    attachment: {
      mediaType: file.mimetype as AttachmentMime,
      base64: file.buffer.toString('base64'),
      byteLength: file.buffer.length,
    },
  }
}
