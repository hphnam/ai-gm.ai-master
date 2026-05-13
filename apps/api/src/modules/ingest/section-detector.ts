// Plan 01-01 — extractor-first → regex fallback → cap-aware split → graceful chunk fallback.
// Pure-code (no LLM) detection per CONTEXT.md decision D-01-A.

import { Injectable } from '@nestjs/common'
import {
  CHUNK_OVERLAP_TOKENS,
  CHUNK_TARGET_TOKENS,
  CSV_ROW_BATCH_SIZE,
  type DetectedChunk,
  type DetectedSection,
  MAX_HEADING_RECURSION_DEPTH,
  SECTION_SOFT_CAP_TOKENS,
  type SectionDetectionResult,
} from '../../types'
import { estimateTokens, slidingWindowChunks, splitByHeadings } from './section-tokens'

const SLIDE_MARKER_RE = /^##\s+Slide\s+\d+/m
const SHEET_MARKER_RE = /^#\s+Sheet:/m
const HEADING_LINE_RE = /^#{1,6}\s+/m

@Injectable()
export class SectionDetector {
  detect(content: string, mimeHint?: string | null): SectionDetectionResult {
    const sections = this.dispatch(content ?? '', mimeHint ?? null)
    return { sections }
  }

  // ──────────────────────────────────────────────────────────────────
  // Dispatch — extractor-first, regex fallback, never LLM.
  // AC-3 strategy decision tree.
  // ──────────────────────────────────────────────────────────────────

  private dispatch(content: string, mimeHint: string | null): DetectedSection[] {
    if (content.trim().length === 0) {
      return [this.singletonSection(null, '', false, false)]
    }

    const mime = (mimeHint ?? '').toLowerCase()

    // CSV / row-stream extractors → row-batched sections (audit-M4).
    if (mime.includes('csv') || mime === 'text/comma-separated-values') {
      return this.csvRowBatch(content)
    }

    // PPTX (slide markers from 04-01 extractor).
    if (mime.includes('presentationml') || SLIDE_MARKER_RE.test(content)) {
      const slides = this.splitOnSlideMarkers(content)
      if (slides.length > 0) return slides.flatMap((s) => this.applyCapPolicy(s.title, s.body))
    }

    // XLSX / sheet-marker streams.
    if (
      mime.includes('spreadsheetml') ||
      mime.includes('xlsx') ||
      mime === 'application/vnd.ms-excel' ||
      SHEET_MARKER_RE.test(content)
    ) {
      const sheets = this.splitOnSheetMarkers(content)
      if (sheets.length > 0) return sheets.flatMap((s) => this.applyCapPolicy(s.title, s.body))
    }

    // Markdown / mammoth-output / generic prose: regex heading split.
    const headingSplits = splitByHeadings(content)

    // AC-3: no detectable structure → 1 section sentinel (needsClustering when oversized).
    if (headingSplits.length === 1 && headingSplits[0].title === null) {
      return this.singleFlatSection(content)
    }

    return headingSplits.flatMap((s) => this.applyCapPolicy(s.title, s.body))
  }

  // ──────────────────────────────────────────────────────────────────
  // Mime-specific splitters.
  // ──────────────────────────────────────────────────────────────────

  /**
   * audit-M4: group rows in batches of CSV_ROW_BATCH_SIZE (= 50). Header row
   * (line 0) is preserved and prepended to every batch's content so retrieval
   * keeps column context. A 10K-row CSV → 200 sections, not 10K.
   */
  private csvRowBatch(content: string): DetectedSection[] {
    const lines = content.split('\n').filter((l, idx, arr) => l.length > 0 || idx < arr.length - 1)
    if (lines.length === 0) return [this.singletonSection(null, '', false, false)]

    const header = lines[0] ?? ''
    const rows = lines.slice(1)
    if (rows.length === 0) {
      // Header-only CSV → one section.
      return [this.singletonSection('Rows 1-1', header, false, false)]
    }

    const sections: DetectedSection[] = []
    for (let i = 0; i < rows.length; i += CSV_ROW_BATCH_SIZE) {
      const batch = rows.slice(i, i + CSV_ROW_BATCH_SIZE)
      const start = i + 1
      const end = i + batch.length
      const body = [header, ...batch].join('\n')
      const tokenCount = estimateTokens(body)
      sections.push({
        title: `Rows ${start}-${end}`,
        content: body,
        tokenCount,
        truncated: false,
        chunks: this.chunksFor(body, tokenCount),
      })
    }
    return sections
  }

  private splitOnSlideMarkers(content: string): { title: string; body: string }[] {
    // Split on lines beginning with `## Slide N`. The marker line itself
    // becomes the title (without the leading `## `).
    const lines = content.split('\n')
    const out: { title: string; body: string }[] = []
    let cur: { title: string; body: string[] } | null = null
    for (const line of lines) {
      const m = /^##\s+(Slide\s+\d+(?::\s*.+)?)\s*$/.exec(line)
      if (m) {
        if (cur) out.push({ title: cur.title, body: cur.body.join('\n').trim() })
        cur = { title: m[1].trim(), body: [] }
      } else if (cur) {
        cur.body.push(line)
      }
    }
    if (cur) out.push({ title: cur.title, body: cur.body.join('\n').trim() })
    return out
  }

  private splitOnSheetMarkers(content: string): { title: string; body: string }[] {
    const lines = content.split('\n')
    const out: { title: string; body: string }[] = []
    let cur: { title: string; body: string[] } | null = null
    for (const line of lines) {
      const m = /^#\s+Sheet:\s*(.+?)\s*$/.exec(line)
      if (m) {
        if (cur) out.push({ title: cur.title, body: cur.body.join('\n').trim() })
        cur = { title: `Sheet: ${m[1].trim()}`, body: [] }
      } else if (cur) {
        cur.body.push(line)
      }
    }
    if (cur) out.push({ title: cur.title, body: cur.body.join('\n').trim() })
    return out
  }

  // ──────────────────────────────────────────────────────────────────
  // Cap policy (AC-4). Recursion-bound at MAX_HEADING_RECURSION_DEPTH (audit-M5).
  // ──────────────────────────────────────────────────────────────────

  private applyCapPolicy(title: string | null, body: string, depth: number = 0): DetectedSection[] {
    const tokenCount = estimateTokens(body)

    if (tokenCount <= SECTION_SOFT_CAP_TOKENS) {
      return [this.singletonSection(title, body, false, false)]
    }

    // Over soft cap. Try sub-heading split before flat-chunk fallback.
    if (depth < MAX_HEADING_RECURSION_DEPTH && HEADING_LINE_RE.test(body)) {
      const sub = splitByHeadings(body, depth + 1)
      // Single empty/no-op split → don't recurse, fallback.
      if (sub.length > 1 || (sub.length === 1 && sub[0].title !== null)) {
        return sub.flatMap((s) => this.applyCapPolicy(s.title ?? title, s.body, depth + 1))
      }
    }

    // Soft-cap exceeded with no sub-heading boundaries — graceful chunk fallback (truncated:true).
    return [this.singletonSection(title, body, true, false)]
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers.
  // ──────────────────────────────────────────────────────────────────

  private singletonSection(
    title: string | null,
    body: string,
    truncated: boolean,
    needsClustering: boolean,
  ): DetectedSection {
    const tokenCount = estimateTokens(body)
    const section: DetectedSection = {
      title,
      content: body,
      tokenCount,
      truncated,
      chunks: this.chunksFor(body, tokenCount),
    }
    if (needsClustering) section.needsClustering = true
    return section
  }

  /**
   * AC-3: 1-section sentinel for plain text with no markers. When that single
   * section's tokenCount > SECTION_SOFT_CAP_TOKENS, mark needsClustering:true
   * (consumed by future plan; this plan does not activate clustering).
   * Cost guard reference (audit-M3): per-doc embed cap kicks in at the ingest
   * layer if chunkCount > MAX_EMBEDS_PER_DOCUMENT.
   */
  private singleFlatSection(content: string): DetectedSection[] {
    const tokenCount = estimateTokens(content)
    const truncated = tokenCount > SECTION_SOFT_CAP_TOKENS
    const needsClustering = tokenCount > SECTION_SOFT_CAP_TOKENS
    return [this.singletonSection(null, content, truncated, needsClustering)]
  }

  private chunksFor(content: string, tokenCount: number): DetectedChunk[] {
    // Empty/whitespace-only body (e.g. heading with no following content)
    // would produce a 400 from Voyage. Section row still persists for
    // navigation; just skip the unembeddable chunk.
    if (content.trim().length === 0) return []
    if (tokenCount <= CHUNK_TARGET_TOKENS) {
      return [{ content, tokenCount }]
    }
    return slidingWindowChunks(content, CHUNK_TARGET_TOKENS, CHUNK_OVERLAP_TOKENS)
  }
}
