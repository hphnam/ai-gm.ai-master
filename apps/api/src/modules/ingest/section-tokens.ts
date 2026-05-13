// Plan 01-01 — pure-code utilities for section detection. No external deps.
// All knobs come from @gm-ai/types so consumers grep one source.

import { CHUNK_OVERLAP_TOKENS, CHUNK_TARGET_TOKENS, MAX_HEADING_RECURSION_DEPTH } from '../../types'

/**
 * Token estimator. Latin-script-biased — over-counts CJK ~4x and under-counts
 * emoji-dense text. Acceptable for soft/hard cap heuristics; insufficient for
 * billing-grade counts. See D-01-01-A trigger ("first non-Latin doc surfaces
 * OR billing-grade counts needed") for tiktoken upgrade.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export type HeadingSplit = { title: string | null; body: string }

const HEADING_LINE_RE = /^(#{1,6})\s+(.+?)\s*$/
const ALL_CAPS_RE = /^[A-Z][A-Z\s]{4,}$/
const HR_RE = /^---+\s*$/

/**
 * Split content at heading-style boundaries. Recurses on its callers' depth
 * counter via the `depth` parameter (audit-M5). When `depth > MAX_HEADING_RECURSION_DEPTH`
 * (= 8), returns a single-element array forcing flat-chunk fallback at the caller.
 * Prevents stack overflow on pathological deeply-nested heading docs.
 *
 * Boundaries:
 *  - markdown headings (`# ` through `###### `)
 *  - ALL-CAPS section labels (≥5 chars, e.g. "EVACUATION PROCEDURE")
 *  - horizontal rules (`---`)
 */
export function splitByHeadings(content: string, depth: number = 0): HeadingSplit[] {
  if (depth > MAX_HEADING_RECURSION_DEPTH) {
    return [{ title: null, body: content }]
  }

  const lines = content.split('\n')
  const splits: HeadingSplit[] = []
  let currentTitle: string | null = null
  let currentBody: string[] = []
  let foundAny = false

  const flush = () => {
    const body = currentBody.join('\n').trim()
    if (currentTitle !== null || body.length > 0) {
      splits.push({ title: currentTitle, body })
    }
  }

  for (const line of lines) {
    const headingMatch = HEADING_LINE_RE.exec(line)
    const isAllCaps = ALL_CAPS_RE.test(line.trim())
    const isHr = HR_RE.test(line.trim())

    if (headingMatch) {
      flush()
      currentTitle = headingMatch[2].trim()
      currentBody = []
      foundAny = true
    } else if (isAllCaps) {
      flush()
      currentTitle = line.trim()
      currentBody = []
      foundAny = true
    } else if (isHr) {
      flush()
      currentTitle = null
      currentBody = []
      foundAny = true
    } else {
      currentBody.push(line)
    }
  }
  flush()

  if (!foundAny) {
    return [{ title: null, body: content }]
  }
  return splits
}

export type SlidingChunk = { content: string; tokenCount: number }

/**
 * Sliding-window character-boundary chunker with overlap. Token-cap is
 * converted to char-budget using the same 4-chars-per-token approximation as
 * `estimateTokens` (consistent heuristic). Never splits mid-word — backs up
 * to the nearest space within a small window.
 */
export function slidingWindowChunks(
  content: string,
  targetTokens: number = CHUNK_TARGET_TOKENS,
  overlapTokens: number = CHUNK_OVERLAP_TOKENS,
): SlidingChunk[] {
  const targetChars = targetTokens * 4
  const overlapChars = overlapTokens * 4
  if (content.length <= targetChars) {
    return [{ content, tokenCount: estimateTokens(content) }]
  }

  const chunks: SlidingChunk[] = []
  let start = 0
  const _stride = Math.max(1, targetChars - overlapChars)

  while (start < content.length) {
    let end = Math.min(content.length, start + targetChars)
    // Back up to nearest whitespace boundary (within last 64 chars) unless we'd
    // collapse the chunk.
    if (end < content.length) {
      const window = Math.min(64, end - start - 1)
      for (let i = 0; i < window; i++) {
        if (/\s/.test(content[end - i - 1])) {
          end = end - i
          break
        }
      }
    }
    const slice = content.slice(start, end)
    chunks.push({ content: slice, tokenCount: estimateTokens(slice) })
    if (end >= content.length) break
    start = end - overlapChars
    if (start < 0) start = 0
  }
  return chunks
}
