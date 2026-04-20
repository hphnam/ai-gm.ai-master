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

const MAX_EXTRACT_CHARS = 1_000_000
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
  const withoutExt = originalname.replace(/\.(pdf|docx|md|txt)$/i, '')
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
] as const

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
export const UPLOAD_EXTRACT_TIMEOUT_MS = EXTRACT_TIMEOUT_MS
