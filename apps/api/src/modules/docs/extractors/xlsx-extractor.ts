// Plan 04-01 Task 1 — XLSX extraction via exceljs.
// Source: https://www.npmjs.com/package/exceljs · verified 2026-04-21
// Source: https://github.com/exceljs/exceljs#readme · verified 2026-04-21 (Workbook + worksheet + cell.text API)

import ExcelJS from 'exceljs'
import { ExtractError, MAX_EXTRACT_CHARS } from '../doc-extract'
import { isZipHeader } from './zip-header'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// audit-M1 boundary: NO raw cell text / sheet content in logger payloads.
// Magic-byte check via shared isZipHeader (Plan 04-01 Task 2 — factored for pptx reuse).

export async function extractXlsx(buffer: Buffer): Promise<string> {
  if (!isZipHeader(buffer)) {
    throw new ExtractError(XLSX_MIME, 'corrupt-bytes')
  }

  // Source: https://github.com/exceljs/exceljs#reading-xlsx · verified 2026-04-21
  // Plan 04-02 Task 1 — exceljs's bundled Buffer types disagree with @types/node on
  // [Symbol.toStringTag] after the @types/express install shifted type resolution.
  // `as any` is the one-off escape hatch for the library-boundary variance; value IS
  // a real Node Buffer at runtime — exceljs will accept it. No other cast shape satisfies
  // both TS's structural nominal check and exceljs's narrow overload.
  const workbook = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any)

  const chunks: string[] = []
  let totalChars = 0

  // Source: https://github.com/exceljs/exceljs#iterate-over-all-sheets · verified 2026-04-21
  workbook.worksheets.forEach((sheet) => {
    if (totalChars >= MAX_EXTRACT_CHARS) return
    const sheetHeader = `## Sheet: ${sheet.name}\n`
    chunks.push(sheetHeader)
    totalChars += sheetHeader.length

    // Source: https://github.com/exceljs/exceljs#iterate-over-all-rows · verified 2026-04-21
    sheet.eachRow({ includeEmpty: false }, (row) => {
      if (totalChars >= MAX_EXTRACT_CHARS) return
      // cell.text renders formula results + dates + shared strings as display text;
      // cell.value returns raw formula strings for formula cells which would pollute extraction.
      // Source: https://github.com/exceljs/exceljs#cell-types · verified 2026-04-21
      const cells: string[] = []
      const lastCol = row.actualCellCount > 0 ? (row.cellCount ?? 0) : 0
      for (let c = 1; c <= lastCol; c++) {
        const cell = row.getCell(c)
        const text = String(cell.text ?? '').trim()
        cells.push(text)
      }
      const line = cells.join('\t').replace(/\s+$/, '')
      if (line.length > 0) {
        const row = line + '\n'
        chunks.push(row)
        totalChars += row.length
      }
    })

    chunks.push('\n')
    totalChars += 1
  })

  const joined = chunks.join('')
  return joined.slice(0, MAX_EXTRACT_CHARS)
}
