export type ExtractErrorReason =
  | 'unsupported-mime'
  | 'corrupt-bytes'
  | 'timeout'
  | 'empty-result'

export class ExtractError extends Error {
  constructor(
    public mimeType: string,
    public reason: ExtractErrorReason,
    cause?: unknown,
  ) {
    super(`extract failed for ${mimeType}: ${reason}`)
    this.name = 'ExtractError'
    if (cause) (this as { cause?: unknown }).cause = cause
  }
}

// Phase 6 — extractText() and the per-MIME dispatch switch were retired in
// favour of ReductoService. See apps/api/src/modules/reducto/reducto.service.ts.
// MAX_EXTRACT_CHARS is retained because image-extractor.ts (Claude vision —
// kept local; different use case from document parsing) still caps its output
// against this constant.
export const MAX_EXTRACT_CHARS = 1_000_000
export const UPLOAD_EXTRACT_TIMEOUT_MS = 30_000

const TITLE_MAX = 200

export function sanitizeUploadTitle(originalname: string): string {
  // Plan 04-01: extended extension set (XLSX/CSV/PPTX/image formats).
  // HEIC omitted — see D-04-01-J in 04-01-SUMMARY (Anthropic SDK media_type union excludes heic).
  const withoutExt = originalname.replace(
    /\.(pdf|docx|md|txt|xlsx|csv|pptx|jpe?g|png|webp)$/i,
    '',
  )
  const noSeparators = withoutExt.replace(/[\\/]/g, ' ')
  // eslint-disable-next-line no-control-regex
  const noControl = noSeparators.replace(/[\x00-\x1f\x7f]/g, '')
  const trimmed = noControl.trim().slice(0, TITLE_MAX)
  return trimmed.length > 0 ? trimmed : 'Untitled upload'
}

export const UPLOAD_MIME_ALLOWLIST = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Plan 04-01 Task 1 — XLSX + CSV.
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  // Plan 04-01 Task 2 — PPTX.
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Plan 04-01 Task 3 — images (jpeg/png/webp). HEIC dropped per D-04-01-J — Anthropic SDK
  // media_type union doesn't include heic. Image path bypasses extractText and is handled
  // directly in DocsController.upload via extractImage (Claude vision).
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

// Plan 04-01 per-MIME cap map (replaces the single UPLOAD_MAX_BYTES gate for fine-grained limits).
// Multer still uses UPLOAD_MAX_BYTES as the ceiling (highest cap across all formats) — per-MIME is
// a second gate enforced in docs.controller.ts after multer accepts. See SCOPE LIMITS in PLAN (audit-S7).
export const UPLOAD_MAX_BYTES_BY_MIME: Readonly<Record<string, number>> = {
  'text/plain': 10 * 1024 * 1024,
  'text/markdown': 10 * 1024 * 1024,
  'application/pdf': 10 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 10 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 10 * 1024 * 1024,
  'text/csv': 10 * 1024 * 1024,
  // Plan 04-01 Task 2 — PPTX gets a larger cap (slide decks carry embedded assets).
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 15 * 1024 * 1024,
  // Plan 04-01 Task 3 — images capped at 5MB (Claude vision base64 input budget).
  'image/jpeg': 5 * 1024 * 1024,
  'image/png': 5 * 1024 * 1024,
  'image/webp': 5 * 1024 * 1024,
} as const

export const UPLOAD_MAX_BYTES = 15 * 1024 * 1024 // ceiling across all formats; per-MIME cap refines per type
