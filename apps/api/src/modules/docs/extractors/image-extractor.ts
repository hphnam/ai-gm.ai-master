// Plan 04-01 Task 3 — image text extraction via Claude vision (claude-sonnet-4-6).
// Source: https://docs.anthropic.com/en/docs/build-with-claude/vision · verified 2026-04-21
//   (image content block shape: { type: 'image', source: { type: 'base64', media_type, data } })
// Source: https://docs.anthropic.com/en/docs/about-claude/pricing.md · verified 2026-04-21
//   (Sonnet 4.6 pricing: $3/MTok input, $15/MTok output)
// Source: apps/api/src/common/sanitise-error.ts (Plan 03-05 audit-M4 / Plan 04-01 audit-M2)

import Anthropic from '@anthropic-ai/sdk'
import type { Logger } from '@nestjs/common'
import { magicByteMatchesMime } from '../../../common/image-magic-bytes'
import { sanitiseError } from '../../../common/sanitise-error'
import { ExtractError, MAX_EXTRACT_CHARS } from '../doc-extract'

// audit-M1 boundary: raw image buffers, base64 strings, extracted text, and Anthropic API keys
// NEVER enter logger payloads. Only metadata (tokens, bytes, mime, duration_ms).

// Plan 04-01 Task 3 APPLY deviation — AC-4 scope reduced from jpeg/png/webp/heic to
// jpeg/png/webp only. Anthropic SDK's image content block media_type union accepts
// jpeg/png/webp/gif (NOT heic) as of verified 2026-04-21. GIF is excluded per AC-4
// intent (non-goal). HEIC support deferred as D-04-01-J — trigger = first real HEIC
// upload + scope adds server-side HEIC→JPEG conversion (sharp or heic-convert).
// Source: @anthropic-ai/sdk ImageBlockParam['source']['media_type'] type union · verified 2026-04-21
export const DOCS_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type DocsImageMime = (typeof DOCS_IMAGE_MIME_TYPES)[number]

export function isDocsImageMime(mime: string): mime is DocsImageMime {
  return (DOCS_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
}

// audit-S2: cost-burst control — prevents N parallel uploads from firing N Claude calls at once.
const MAX_CONCURRENT_IMAGE_EXTRACTS = 3
const IMAGE_EXTRACT_QUEUE_TIMEOUT_MS = 15_000

let inFlight = 0
const waiters: Array<() => void> = []

async function acquireSlot(logger: Logger, mimeType: string): Promise<void> {
  if (inFlight < MAX_CONCURRENT_IMAGE_EXTRACTS) {
    inFlight++
    return
  }
  logger.log(
    JSON.stringify({
      level: 'log',
      event: 'docs.image_extract_queued',
      inFlight,
      queueLength: waiters.length,
    }),
  )
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      const i = waiters.indexOf(run)
      if (i >= 0) waiters.splice(i, 1)
      reject(new ExtractError(mimeType, 'timeout'))
    }, IMAGE_EXTRACT_QUEUE_TIMEOUT_MS)
    const run = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      inFlight++
      resolve()
    }
    waiters.push(run)
  })
}

function releaseSlot(): void {
  inFlight = Math.max(0, inFlight - 1)
  const next = waiters.shift()
  if (next) next()
}

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it to .env at repo root')
  _client = new Anthropic({ apiKey })
  return _client
}

// Sonnet 4.6 pricing (MTok).
const INPUT_USD_PER_MTOK = 3
const OUTPUT_USD_PER_MTOK = 15

function estimateUsd(inputTokens: number, outputTokens: number): number {
  const usd =
    (inputTokens / 1_000_000) * INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * OUTPUT_USD_PER_MTOK
  return Math.round(usd * 10_000) / 10_000
}

const IMAGE_EXTRACT_PROMPT =
  'Extract every piece of visible text, list item, table entry, instruction, heading, and diagram label from this image. Preserve the visual hierarchy (titles above body, bullets as bullets, numbered steps in order). If the image is a checklist, list every step verbatim. Do not add summary, interpretation, or commentary — output only the extracted content.'

export type ImageExtractCost = {
  inputTokens: number
  outputTokens: number
  estimatedUsd: number
  mime: string
  imageBytes: number
}

export type ImageExtractResult = {
  text: string
  sourceBytes: Buffer
  cost: ImageExtractCost
}

export async function extractImage(
  buffer: Buffer,
  mimeType: string,
  logger: Logger,
): Promise<ImageExtractResult> {
  if (!isDocsImageMime(mimeType)) {
    throw new ExtractError(mimeType, 'unsupported-mime')
  }
  if (!magicByteMatchesMime(buffer, mimeType)) {
    throw new ExtractError(mimeType, 'corrupt-bytes')
  }

  await acquireSlot(logger, mimeType)
  try {
    const client = getClient()
    // Source: https://docs.anthropic.com/en/docs/build-with-claude/vision · verified 2026-04-21
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: buffer.toString('base64'),
              },
            },
            { type: 'text', text: IMAGE_EXTRACT_PROMPT },
          ],
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('')
      .slice(0, MAX_EXTRACT_CHARS)

    if (text.trim().length === 0) {
      throw new ExtractError(mimeType, 'empty-result')
    }

    const cost: ImageExtractCost = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      estimatedUsd: estimateUsd(response.usage.input_tokens, response.usage.output_tokens),
      mime: mimeType,
      imageBytes: buffer.length,
    }

    return { text, sourceBytes: buffer, cost }
  } catch (err) {
    if (err instanceof ExtractError) throw err
    // sanitiseError (shared util, audit-M2) is the ONLY path an SDK/fetch error body enters the
    // ExtractError cause. Anthropic API keys live in fetch error bodies on some error classes;
    // String(err) / JSON.stringify(err) would leak them.
    throw new ExtractError(mimeType, 'corrupt-bytes', new Error(sanitiseError(err)))
  } finally {
    releaseSlot()
  }
}
