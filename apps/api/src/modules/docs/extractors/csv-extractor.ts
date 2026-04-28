// Plan 04-01 Task 1 — CSV extraction via csv-parse (sync mode).
// Source: https://www.npmjs.com/package/csv-parse · verified 2026-04-21
// Source: https://csv.js.org/parse/api/sync/ · verified 2026-04-21 (parse() returns string[][])

import { parse } from 'csv-parse/sync'
import { ExtractError, MAX_EXTRACT_CHARS } from '../doc-extract'
import { decodeCsvBuffer, looksLikeDelimitedText, sniffCsvDelimiter } from './decode-csv-text'

const CSV_MIME = 'text/csv'

// audit-M1 boundary: NO raw row content in logger payloads.
// Decode → guard. UTF-16 LE/BE BOM detection happens in decodeCsvBuffer so
// real-world POS exports (Square, Toast, Shopify) that ship UTF-16 with a
// `.csv` extension don't trip the "corrupt-bytes" guard. Tab-delimited
// exports (TSV-as-CSV) are handled by the multi-delimiter csv-parse config.

export async function extractCsv(buffer: Buffer): Promise<string> {
  if (buffer.length === 0) {
    throw new ExtractError(CSV_MIME, 'corrupt-bytes')
  }

  const text = decodeCsvBuffer(buffer)
  if (!looksLikeDelimitedText(text)) {
    throw new ExtractError(CSV_MIME, 'corrupt-bytes')
  }

  const delimiter = sniffCsvDelimiter(text)

  let rows: string[][]
  try {
    // Source: https://csv.js.org/parse/options/ · verified 2026-04-21
    // Single delimiter from the header sniff — passing an array makes
    // csv-parse treat every char as a record separator simultaneously,
    // which mangles cells like `£2,284.04` in tab-delimited POS exports.
    rows = parse(text, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      delimiter,
    }) as string[][]
  } catch (err) {
    // csv-parse errors don't carry secrets, but we go through ExtractError for uniform handling.
    throw new ExtractError(CSV_MIME, 'corrupt-bytes', err)
  }

  const chunks: string[] = []
  let totalChars = 0
  for (const row of rows) {
    if (totalChars >= MAX_EXTRACT_CHARS) break
    const line = row.map((c) => String(c ?? '').trim()).join('\t').replace(/\s+$/, '')
    if (line.length === 0) continue
    const withNl = line + '\n'
    chunks.push(withNl)
    totalChars += withNl.length
  }

  return chunks.join('').slice(0, MAX_EXTRACT_CHARS)
}
