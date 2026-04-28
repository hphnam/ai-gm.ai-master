// Plan 05-01 Task 2 — structured-data extraction parallel to the existing
// string-returning csv-extractor / xlsx-extractor. Returns
// { columns: string[], rows: Record<string,string>[] } so each source row
// can be persisted as a JSONB object in tabular_rows.
//
// Reuses csv-parse/sync (CSV) and exceljs (XLSX) — same library surface as the
// existing extractors so we don't introduce parser drift between the two paths.
//
// Single-sheet for XLSX (sheet 1 only) — multi-sheet deferred D-05-01-A.
// audit-M1 boundary: NO raw row content / column names in logger payloads.

import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'
import { ExtractError } from '../doc-extract'
import { isZipHeader } from './zip-header'
import { decodeCsvBuffer, looksLikeDelimitedText, sniffCsvDelimiter } from './decode-csv-text'
import {
  TABULAR_MIMES,
  type TabularExtractionResult,
  type TabularMime,
} from '@gm-ai/types'

const CSV_MIME: TabularMime = 'text/csv'
const XLSX_MIME: TabularMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function dedupeHeader(raw: string[]): string[] {
  // Source-row dicts are keyed by header name. Duplicate header cells would
  // silently collide on `Record<string,string>` — disambiguate with a numeric
  // suffix so every cell is round-trippable. "" (empty) headers also get a
  // synthetic name so JSONB keys are never empty strings.
  const seen = new Map<string, number>()
  return raw.map((cell, idx) => {
    const base = cell.trim() === '' ? `column_${idx + 1}` : cell.trim()
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

async function extractTabularCsv(buffer: Buffer): Promise<TabularExtractionResult> {
  if (buffer.length === 0) {
    throw new ExtractError(CSV_MIME, 'corrupt-bytes')
  }
  const text = decodeCsvBuffer(buffer)
  if (!looksLikeDelimitedText(text)) {
    throw new ExtractError(CSV_MIME, 'corrupt-bytes')
  }

  const delimiter = sniffCsvDelimiter(text)

  let raw: string[][]
  try {
    raw = parse(text, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      delimiter,
    }) as string[][]
  } catch (err) {
    throw new ExtractError(CSV_MIME, 'corrupt-bytes', err)
  }

  if (raw.length < 2) {
    throw new ExtractError(CSV_MIME, 'empty-result')
  }

  const columns = dedupeHeader(raw[0].map((c) => String(c ?? '')))
  const rows: Record<string, string>[] = []
  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i]
    const obj: Record<string, string> = {}
    for (let c = 0; c < columns.length; c++) {
      obj[columns[c]] = String(cells[c] ?? '').trim()
    }
    rows.push(obj)
  }

  return { columns, rows }
}

async function extractTabularXlsx(buffer: Buffer): Promise<TabularExtractionResult> {
  if (!isZipHeader(buffer)) {
    throw new ExtractError(XLSX_MIME, 'corrupt-bytes')
  }

  const workbook = new ExcelJS.Workbook()
  // Same Buffer-cast escape hatch the existing xlsx-extractor uses — exceljs's
  // bundled Buffer types disagree with @types/node, value is a real Node Buffer
  // at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any)

  // D-05-01-A: single-sheet only. Trigger to deferred plan: first customer with
  // multi-sheet upload that breaks the assumption.
  const sheet = workbook.worksheets[0]
  if (!sheet) {
    throw new ExtractError(XLSX_MIME, 'empty-result')
  }

  // Find the first non-empty row → header. Subsequent non-empty rows → data.
  const allRows: string[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = []
    const lastCol = row.actualCellCount > 0 ? (row.cellCount ?? 0) : 0
    for (let c = 1; c <= lastCol; c++) {
      const cell = row.getCell(c)
      cells.push(String(cell.text ?? '').trim())
    }
    if (cells.some((c) => c.length > 0)) {
      allRows.push(cells)
    }
  })

  if (allRows.length < 2) {
    throw new ExtractError(XLSX_MIME, 'empty-result')
  }

  const columns = dedupeHeader(allRows[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < allRows.length; i++) {
    const cells = allRows[i]
    const obj: Record<string, string> = {}
    for (let c = 0; c < columns.length; c++) {
      obj[columns[c]] = String(cells[c] ?? '').trim()
    }
    rows.push(obj)
  }

  return { columns, rows }
}

export async function extractTabular(
  buffer: Buffer,
  mime: string,
): Promise<TabularExtractionResult> {
  if (!(TABULAR_MIMES as readonly string[]).includes(mime)) {
    throw new ExtractError(mime, 'unsupported-mime')
  }
  if (mime === CSV_MIME) return extractTabularCsv(buffer)
  return extractTabularXlsx(buffer)
}
