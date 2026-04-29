// Plan 05-01 Task 2 — naive majority-vote column-type inference.
//
// Per AC-3:
//   - 'number' wins if ≥0.8 * non-empty cells parse via Number() and Number.isFinite
//   - else 'date' wins if ≥0.8 * non-empty cells parse via Date.parse() and are
//     NOT also valid finite numbers (avoid misclassifying years/integers as dates)
//   - else 'string'
//   - empty/null cells excluded from the vote
//   - empty column (no non-empty cells) → 'string'
//
// The inferred type drives query-time JSONB casting in TabularQueryService:
// numeric aggregates (sum/avg/min/max) require inferredType='number'; otherwise
// the query rejects with reason='invalid-input'.

import type { InferredColumn } from '../../types'

const NUMBER_THRESHOLD = 0.8
const DATE_THRESHOLD = 0.8

// Strip currency symbols + thousands separators so values like "£2,284.04"
// or "$1,000.50" are recognised as numbers. POS exports and accounting tools
// routinely produce these. Kept in sync with the SQL strip in
// TabularQueryService (NUMERIC_STRIP_REGEX) — both sides must agree on what
// counts as a numeric prefix/separator or queries will silently fail.
const CURRENCY_AND_SEPARATORS_RE = /[£$€¥,\s]/g

export function stripCurrencyForNumber(v: string): string {
  return v.replace(CURRENCY_AND_SEPARATORS_RE, '')
}

function isNonEmpty(v: string): boolean {
  return v != null && v.trim().length > 0
}

function isFiniteNumber(v: string): boolean {
  // Number('') === 0 and Number('   ') === 0 — both must be excluded.
  // We pre-trim, strip currency/separators, then check non-empty so
  // formatted values like "£2,284.04" are recognised as numbers.
  const stripped = stripCurrencyForNumber(v.trim())
  if (stripped.length === 0) return false
  const n = Number(stripped)
  return Number.isFinite(n)
}

function isParseableDate(v: string): boolean {
  const trimmed = v.trim()
  if (trimmed.length === 0) return false
  // A bare integer like "2024" parses via Date.parse() in some engines as
  // ms-since-epoch — exclude anything that's also a finite number so columns
  // of years/SKUs don't slip into 'date'.
  if (isFiniteNumber(trimmed)) return false
  return !Number.isNaN(Date.parse(trimmed))
}

export function inferColumnTypes(
  rows: ReadonlyArray<Record<string, string>>,
  columns: ReadonlyArray<string>,
): InferredColumn[] {
  return columns.map((name, ordinal) => {
    let nonEmpty = 0
    let numberHits = 0
    let dateHits = 0

    for (const row of rows) {
      const cell = row[name]
      if (cell == null || !isNonEmpty(cell)) continue
      nonEmpty += 1
      if (isFiniteNumber(cell)) {
        numberHits += 1
      } else if (isParseableDate(cell)) {
        dateHits += 1
      }
    }

    if (nonEmpty === 0) {
      return { name, ordinal, inferredType: 'string' as const }
    }

    if (numberHits / nonEmpty >= NUMBER_THRESHOLD) {
      return { name, ordinal, inferredType: 'number' as const }
    }
    if (dateHits / nonEmpty >= DATE_THRESHOLD) {
      return { name, ordinal, inferredType: 'date' as const }
    }
    return { name, ordinal, inferredType: 'string' as const }
  })
}
