// Plan 04-01 Task 1 — CSV extraction via csv-parse (sync mode).
// Source: https://www.npmjs.com/package/csv-parse · verified 2026-04-21
// Source: https://csv.js.org/parse/api/sync/ · verified 2026-04-21 (parse() returns string[][])

import { parse } from 'csv-parse/sync'
import { ExtractError, MAX_EXTRACT_CHARS } from '../doc-extract'

const CSV_MIME = 'text/csv'

// audit-M1 boundary: NO raw row content in logger payloads.
// Sanity check: a CSV file must UTF-8 decode AND contain at least one newline AND no NUL bytes.
// This catches binary payloads misdeclared as text/csv before csv-parse throws a cryptic error.
function looksLikeCsvText(buffer: Buffer): boolean {
  if (buffer.length === 0) return false
  if (buffer.includes(0x00)) return false
  const text = buffer.toString('utf-8')
  return text.includes('\n')
}

export async function extractCsv(buffer: Buffer): Promise<string> {
  if (!looksLikeCsvText(buffer)) {
    throw new ExtractError(CSV_MIME, 'corrupt-bytes')
  }

  const text = buffer.toString('utf-8')

  let rows: string[][]
  try {
    // Source: https://csv.js.org/parse/options/ · verified 2026-04-21
    rows = parse(text, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
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
