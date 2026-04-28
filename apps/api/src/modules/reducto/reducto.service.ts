// Phase 6 — Reducto extraction service. Replaces the local format-specific
// extractors (csv-extractor, xlsx-extractor, pptx-extractor, tabular-extractor)
// with a single API call. Reducto's parse endpoint returns BOTH text content
// and structured tables in one response, so the previous "extractText then
// extractTabular from the same buffer" two-step disappears.
//
// SOC-2: Reducto holds documents for ≤24h and AES-256 encrypts at rest. We
// upload-then-parse-then-discard. No file_id is persisted on KnowledgeItem
// because Reducto's retention is shorter than our typical re-enrichment window.
//
// audit-M1 boundary: NO raw row content / column names / extracted text in
// logger payloads. Reducto's response stays in-memory; only counts + bytes
// + page totals + latency hit logs.
//
// Source: https://docs.reducto.ai/api-reference/parse.md · verified 2026-04-28
// Source: https://docs.reducto.ai/upload/overview.md · verified 2026-04-28
// Source: https://docs.reducto.ai/configs/parse/table-output-formats.md · verified 2026-04-28

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { assertAuthEnv } from '../auth/assert-auth-env'
import type { TabularExtractionResult } from '@gm-ai/types'

/// Result shape consumed by the docs / ingest pipeline. text is the joined
/// body content (markdown-friendly); tables are the structured row arrays
/// pulled out of any block of type=Table for the tabular-row store.
export type ParsedDocument = {
  text: string
  tables: TabularExtractionResult[]
  /// PII-safe diagnostic for log payloads. Not stored.
  pageCount: number
}

/// Reducto's table format='json' produces a `[[headers], [row1], ...]`
/// nested-array string — caller dejsons it via this helper. Header row 0;
/// subsequent rows are data.
function parseReductoTableJson(content: string): TabularExtractionResult | null {
  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed) || parsed.length < 1) return null
    const headerRow = parsed[0]
    if (!Array.isArray(headerRow) || headerRow.length === 0) return null

    // Header dedup — same convention as the old tabular-extractor: empty
    // cells get column_N synthetic names, duplicates get _2/_3 suffix so
    // JSONB row dicts have unique keys.
    const seen = new Map<string, number>()
    const columns = headerRow.map((cell, idx) => {
      const trimmed = String(cell ?? '').trim()
      const base = trimmed === '' ? `column_${idx + 1}` : trimmed
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      return count === 0 ? base : `${base}_${count + 1}`
    })

    const rows: Record<string, string>[] = []
    for (let i = 1; i < parsed.length; i++) {
      const cells = parsed[i]
      if (!Array.isArray(cells)) continue
      const obj: Record<string, string> = {}
      for (let c = 0; c < columns.length; c++) {
        obj[columns[c]] = String(cells[c] ?? '').trim()
      }
      rows.push(obj)
    }

    return { columns, rows }
  } catch {
    return null
  }
}

@Injectable()
export class ReductoService implements OnModuleInit {
  private readonly logger = new Logger(ReductoService.name)
  private baseUrl!: string
  private apiKey!: string

  onModuleInit() {
    const env = assertAuthEnv()
    this.baseUrl = env.reducto.baseUrl
    this.apiKey = env.reducto.apiKey
  }

  /// Upload a buffer to Reducto and return the file_id (reducto://<uuid>.<ext>)
  /// to pass into parse(). Multipart upload, ≤100MB enforced upstream by our
  /// existing UPLOAD_MAX_BYTES gate.
  async upload(buffer: Buffer, filename: string, mime: string): Promise<string> {
    const startedAt = Date.now()
    // Web standard FormData — Node 24+ globalThis.FormData. Blob also global.
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mime }), filename)

    const res = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    })
    if (!res.ok) {
      const detail = await safeReadError(res)
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'reducto.upload_failed',
          status: res.status,
          detail,
          mime,
          bytes: buffer.length,
          latencyMs: Date.now() - startedAt,
        }),
      )
      throw new ReductoError('upload', res.status, detail)
    }
    const body = (await res.json()) as { file_id?: string }
    if (!body.file_id) {
      throw new ReductoError('upload', res.status, 'no file_id in response')
    }
    this.logger.log(
      JSON.stringify({
        level: 'info',
        event: 'reducto.uploaded',
        mime,
        bytes: buffer.length,
        latencyMs: Date.now() - startedAt,
      }),
    )
    return body.file_id
  }

  /// Parse a previously-uploaded file. Sync mode — Reducto returns the full
  /// result in the response body. table_output_format='json' so table blocks
  /// land as a parseable nested-array string.
  async parse(fileId: string): Promise<ParsedDocument> {
    const startedAt = Date.now()
    const res = await fetch(`${this.baseUrl}/parse`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: fileId,
        formatting: { table_output_format: 'json' },
      }),
    })
    if (!res.ok) {
      const detail = await safeReadError(res)
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'reducto.parse_failed',
          status: res.status,
          detail,
          latencyMs: Date.now() - startedAt,
        }),
      )
      throw new ReductoError('parse', res.status, detail)
    }
    // Source: https://docs.reducto.ai/api-reference/parse.md (response shape).
    type ReductoBlock = { type: string; content: string }
    type ReductoChunk = { content?: string; blocks?: ReductoBlock[] }
    type ReductoResponse = {
      job_id: string
      duration?: number
      usage?: { num_pages?: number }
      result?: { type: string; chunks?: ReductoChunk[] }
    }
    const body = (await res.json()) as ReductoResponse

    const chunks = body.result?.chunks ?? []
    const textParts: string[] = []
    const tables: TabularExtractionResult[] = []
    let blockCount = 0
    let tableBlockCount = 0
    for (const chunk of chunks) {
      for (const block of chunk.blocks ?? []) {
        blockCount += 1
        if (block.type === 'Table') {
          tableBlockCount += 1
          const parsed = parseReductoTableJson(block.content)
          if (parsed && parsed.columns.length > 0) tables.push(parsed)
        } else {
          // Text / Header / Footer / Figure-with-caption / etc. all flatten to
          // the document body. Reducto's intelligent_ordering is off by default
          // so we get blocks in reading order.
          if (block.content && block.content.length > 0) {
            textParts.push(block.content)
          }
        }
      }
    }
    const text = textParts.join('\n\n').trim()

    const pageCount = body.usage?.num_pages ?? 0
    this.logger.log(
      JSON.stringify({
        level: 'info',
        event: 'reducto.parsed',
        pages: pageCount,
        blockCount,
        tableBlockCount,
        textLen: text.length,
        rowCount: tables.reduce((acc, t) => acc + t.rows.length, 0),
        latencyMs: Date.now() - startedAt,
      }),
    )

    return { text, tables, pageCount }
  }
}

export class ReductoError extends Error {
  constructor(
    public op: 'upload' | 'parse',
    public status: number,
    public detail: string,
  ) {
    super(`reducto ${op} failed (${status}): ${detail}`)
    this.name = 'ReductoError'
  }
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text()
    // Cap + redact obvious URL/key patterns. Reducto error bodies tend to be
    // small JSON {"error": "..."} but we hedge.
    return text.slice(0, 400).replace(/[A-Za-z0-9_\-]{32,}/g, '<token>')
  } catch {
    return '(no response body)'
  }
}
