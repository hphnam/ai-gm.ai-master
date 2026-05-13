import * as chardet from 'chardet'
import iconv from 'iconv-lite'

export type ExtractErrorReason = 'unsupported-mime' | 'corrupt-bytes' | 'timeout' | 'empty-result'

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
  const withoutExt = originalname.replace(/\.(pdf|docx|md|txt|xlsx|csv|pptx|jpe?g|png|webp)$/i, '')
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

const TEXTLIKE_MIMES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'application/csv',
  'application/x-csv',
  'application/vnd.ms-excel', // some browsers tag CSV this way
  'application/octet-stream', // generic — sniff by extension
])

const TEXTLIKE_EXTENSIONS = /\.(csv|tsv|txt|md|log)$/i

export function isTextLikeUpload(mime: string, filename: string): boolean {
  return TEXTLIKE_MIMES.has(mime) || TEXTLIKE_EXTENSIONS.test(filename)
}

// Detect the buffer's encoding (BOM fast-path → chardet fallback) and
// re-emit as UTF-8 so downstream consumers (Reducto, Postgres) get clean
// text. POS exports are commonly UTF-16 LE (Square), Windows-1252 (legacy
// Excel on Windows), or MacRoman; chardet covers all of these plus the
// long tail. UTF-8 input passes through unchanged.
export function normalizeTextBufferEncoding(buf: Buffer, mime: string, filename = ''): Buffer {
  if (!isTextLikeUpload(mime, filename) || buf.length < 2) return buf

  // BOM fast-path — explicit BOMs are authoritative, skip chardet.
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3) // UTF-8 BOM — strip and pass through.
  }
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    return Buffer.from(buf.subarray(2).toString('utf16le'), 'utf8')
  }
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2))
    swapped.swap16()
    return Buffer.from(swapped.toString('utf16le'), 'utf8')
  }

  // No BOM — let chardet sniff. Sample the first 64KB to keep large files cheap.
  const sample = buf.length > 65_536 ? buf.subarray(0, 65_536) : buf
  const detected = chardet.detect(sample)
  if (!detected) return buf

  const enc = detected.toUpperCase()
  if (enc === 'UTF-8' || enc === 'ASCII') return buf
  if (!iconv.encodingExists(enc)) return buf

  return iconv.encode(iconv.decode(buf, enc), 'utf8')
}

// Reducto's CSV parser splits on commas, but Square/Excel "save as CSV" often
// produces tab-delimited content (especially in UK/EU locales where £2,284.04
// uses commas as thousand separators). The result: cells get shredded mid-
// number. Detect tab-as-delimiter on text-like uploads and re-emit as proper
// quoted CSV before sending to Reducto.
const TAB_VS_COMMA_THRESHOLD = 1.5

export function normalizeDelimiter(buf: Buffer, mime: string, filename = ''): Buffer {
  if (!isTextLikeUpload(mime, filename) || buf.length < 2) return buf

  // Sample first ~16 lines to decide. CSV files have stable structure so this
  // is enough to disambiguate without scanning the whole file.
  const sampleText = buf.subarray(0, Math.min(buf.length, 8_192)).toString('utf8')
  const sampleLines = sampleText
    .split(/\r?\n/)
    .slice(0, 16)
    .filter((l) => l.length > 0)
  if (sampleLines.length < 2) return buf

  let tabs = 0
  let commas = 0
  for (const line of sampleLines) {
    for (let i = 0; i < line.length; i++) {
      const c = line.charCodeAt(i)
      if (c === 9) tabs++
      else if (c === 44) commas++
    }
  }

  // Only convert when tabs clearly dominate. A pure CSV with stray tabs in a
  // notes column should not flip; a TSV with commas inside numeric values
  // should.
  if (tabs < commas * TAB_VS_COMMA_THRESHOLD || tabs === 0) return buf

  const text = buf.toString('utf8')
  const converted = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .split('\t')
        .map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join(','),
    )
    .join('\n')
  return Buffer.from(converted, 'utf8')
}
