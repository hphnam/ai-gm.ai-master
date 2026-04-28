import { z } from 'zod'

// ──────────────────────────────────────────────────────────────────
// Plan 05-01 (v0.3 Phase 5 Tabular Query Path) — structured-data path
// constants + Zod contracts for the tabular extractor and query DSL.
// ──────────────────────────────────────────────────────────────────

/// Per-doc hard cap on persisted rows. Uploads exceeding this fail-soft:
/// first N rows are persisted, KnowledgeItem.metadata.tabularRowCapExceeded=true,
/// `tabular.row_cap_exceeded` warn log is emitted. Section/chunk persistence
/// (Phase 1 path) is unaffected.
export const MAX_TABULAR_ROWS_PER_DOC = 50_000

/// Closed-enum sort columns recognised by query_document_table outside the
/// per-doc column whitelist. `_aggregate` is only valid when an aggregate is
/// present; `_row_index` is always valid and resolves to tabular_rows.row_index
/// (used for enumeration / "list all rows in source order").
export const TABULAR_MAGIC_SORT_COLUMNS = ['_aggregate', '_row_index'] as const

/// MIME types eligible for tabular extraction. Keep narrow — additions require
/// extending tabular-extractor.ts and re-running probe-tabular.
export const TABULAR_MIMES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const
export type TabularMime = (typeof TABULAR_MIMES)[number]

export const InferredColumnTypeSchema = z.enum(['number', 'date', 'string'])
export type InferredColumnType = z.infer<typeof InferredColumnTypeSchema>

// ──────────────────────────────────────────────────────────────────
// Extractor contract — pure data, no DB ids yet.
// ──────────────────────────────────────────────────────────────────

export const TabularExtractionResultSchema = z.object({
  columns: z.array(z.string()).min(1),
  rows: z.array(z.record(z.string(), z.string())),
})
export type TabularExtractionResult = z.infer<typeof TabularExtractionResultSchema>

export const InferredColumnSchema = z.object({
  name: z.string(),
  ordinal: z.number().int().min(0),
  inferredType: InferredColumnTypeSchema,
})
export type InferredColumn = z.infer<typeof InferredColumnSchema>

// ──────────────────────────────────────────────────────────────────
// Query DSL — TabularQueryInputSchema. Closed enums for op + fn.
// Magic sort columns: `_aggregate` (aggregate result alias) and `_row_index`
// (source-row position — used for enumeration queries).
// ──────────────────────────────────────────────────────────────────

export const TabularFilterOpSchema = z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'contains'])
export type TabularFilterOp = z.infer<typeof TabularFilterOpSchema>

export const TabularAggregateFnSchema = z.enum(['count', 'sum', 'avg', 'min', 'max'])
export type TabularAggregateFn = z.infer<typeof TabularAggregateFnSchema>

export const TabularSortDirectionSchema = z.enum(['asc', 'desc'])
export type TabularSortDirection = z.infer<typeof TabularSortDirectionSchema>

export const TabularFilterSchema = z.object({
  column: z.string().min(1),
  op: TabularFilterOpSchema,
  value: z.union([z.string(), z.number()]),
})
export type TabularFilter = z.infer<typeof TabularFilterSchema>

export const TabularAggregateSchema = z.object({
  column: z.string().min(1).optional(),
  fn: TabularAggregateFnSchema,
})
export type TabularAggregate = z.infer<typeof TabularAggregateSchema>

export const TabularSortSchema = z.object({
  column: z.string().min(1),
  direction: TabularSortDirectionSchema,
})
export type TabularSort = z.infer<typeof TabularSortSchema>

/// Default and maximum LIMIT for tabular queries. Default 100 keeps payloads
/// small for the common aggregate/lookup case; cap at 1000 prevents runaway
/// prompt growth on enumeration over large docs.
export const TABULAR_QUERY_DEFAULT_LIMIT = 100
export const TABULAR_QUERY_MAX_LIMIT = 1_000

export const TabularQueryInputSchema = z.object({
  docId: z.string().uuid(),
  filters: z.array(TabularFilterSchema).optional(),
  groupBy: z.string().min(1).optional(),
  aggregate: TabularAggregateSchema.optional(),
  sort: TabularSortSchema.optional(),
  limit: z.number().int().min(1).max(TABULAR_QUERY_MAX_LIMIT).optional(),
})
export type TabularQueryInput = z.infer<typeof TabularQueryInputSchema>

/// Output rows are heterogeneous: each row is keyed by source column names
/// (string|number values from JSONB) plus an optional `_aggregate` field when
/// an aggregate is present. truncated=true when the result hit the LIMIT.
export const TabularQueryResultSchema = z.object({
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
  rowCount: z.number().int().min(0),
  truncated: z.boolean(),
})
export type TabularQueryResult = z.infer<typeof TabularQueryResultSchema>
