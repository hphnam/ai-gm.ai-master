/**
 * Plan 01-02 audit-M1 + S1 — content-sniff MIME inference for backfill.
 *
 * KnowledgeItem rows do NOT carry a `mimeType` column, so when we replay the
 * ingest pipeline against existing rows we lose the extractor dispatch hint
 * (CSV row-batching, PPTX slide-marker split, sheet-marker split). This helper
 * recovers that hint by sniffing extractor-emitted markers in the stored content.
 *
 * Conservative — when in doubt, returns null so SectionDetector falls through
 * to its heading-regex path. Order matters; first match wins.
 *
 * Pure function — no DB, no I/O, no external calls.
 */

const SLIDE_MARKER_RE = /^##\s+Slide\s+\d+/m
const SHEET_MARKER_RE = /^#\s+Sheet:/m

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const CSV_MIME = 'text/csv'

export function detectMimeFromContent(content: string): string | null {
  if (!content || content.length === 0) return null

  if (SLIDE_MARKER_RE.test(content)) return PPTX_MIME
  if (SHEET_MARKER_RE.test(content)) return XLSX_MIME

  // CSV detection — conservative shape match.
  // First line has ≥2 commas AND ≥80% of the next 20 sampled lines have the
  // same comma count ±1. Catches well-formed extractor output without
  // misclassifying narrative prose with stray commas.
  const lines = content.split('\n').filter((l) => l.length > 0)
  if (lines.length >= 2) {
    const headerCommas = countCommas(lines[0])
    if (headerCommas >= 2) {
      const sample = lines.slice(1, 21)
      let matching = 0
      for (const l of sample) {
        const c = countCommas(l)
        if (Math.abs(c - headerCommas) <= 1) matching++
      }
      const ratio = sample.length > 0 ? matching / sample.length : 0
      if (ratio >= 0.8) return CSV_MIME
    }
  }

  return null
}

function countCommas(line: string): number {
  let n = 0
  for (let i = 0; i < line.length; i++) if (line.charCodeAt(i) === 44) n++
  return n
}
