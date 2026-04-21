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

// Plan 04-01: exported so per-format extractors (apps/api/src/modules/docs/extractors/*.ts)
// can respect the same cap without duplicating the constant.
export const MAX_EXTRACT_CHARS = 1_000_000
const EXTRACT_TIMEOUT_MS = 30_000

async function withTimeout<T>(p: Promise<T>, mimeType: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ExtractError(mimeType, 'timeout')),
      EXTRACT_TIMEOUT_MS,
    )
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    let text: string
    switch (mimeType) {
      case 'text/plain':
      case 'text/markdown':
        text = buffer.toString('utf-8').slice(0, MAX_EXTRACT_CHARS)
        break
      case 'application/pdf': {
        const { extractText: unpdfExtract } = await import('unpdf')
        const { text: unpdfText } = await withTimeout(
          unpdfExtract(new Uint8Array(buffer), { mergePages: true }),
          mimeType,
        )
        const joined = Array.isArray(unpdfText) ? unpdfText.join('\n\n') : unpdfText
        text = (joined ?? '').slice(0, MAX_EXTRACT_CHARS)
        break
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const mammoth = await import('mammoth')
        const { value } = await withTimeout(mammoth.extractRawText({ buffer }), mimeType)
        text = (value ?? '').slice(0, MAX_EXTRACT_CHARS)
        break
      }
      // Plan 04-01: new cases (existing PDF/DOCX/TXT/MD cases above are byte-identical per AC-6).
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        const { extractXlsx } = await import('./extractors/xlsx-extractor')
        text = await withTimeout(extractXlsx(buffer), mimeType)
        break
      }
      case 'text/csv': {
        const { extractCsv } = await import('./extractors/csv-extractor')
        text = await withTimeout(extractCsv(buffer), mimeType)
        break
      }
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
        const { extractPptx } = await import('./extractors/pptx-extractor')
        text = await withTimeout(extractPptx(buffer), mimeType)
        break
      }
      default:
        throw new ExtractError(mimeType, 'unsupported-mime')
    }
    if (text.trim().length === 0) {
      throw new ExtractError(mimeType, 'empty-result')
    }
    return text
  } catch (err) {
    if (err instanceof ExtractError) throw err
    throw new ExtractError(mimeType, 'corrupt-bytes', err)
  }
}

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
export const UPLOAD_EXTRACT_TIMEOUT_MS = EXTRACT_TIMEOUT_MS
