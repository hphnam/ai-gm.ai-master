// Plan 05-01 Task 3 — TabularQueryService.
//
// Structured query DSL over tabular_rows JSONB. The agent calls this via the
// `query_document_table` tool with a typed input shape (TabularQueryInputSchema).
//
// Security model (defence-in-depth):
//   1. Tenant guard: every query joins through knowledge_items with
//      WHERE ki.organization_id = $callerOrgId — non-bypassable. Cross-org doc id
//      → ok:false reason='not-found' (404-style; Phase 1 enumeration-leak decision).
//   2. Column whitelist: every column reference (filter / groupBy / aggregate /
//      sort) validated against tabular_columns.name for the doc BEFORE composing SQL.
//      Magic columns _aggregate (only valid with aggregate) and _row_index are the
//      only exceptions.
//   3. Closed-enum SQL fragments: op (eq/gt/lt/gte/lte/contains) and aggregate fn
//      (count/sum/avg/min/max) map from a fixed in-code dictionary to predetermined
//      SQL fragments. NEVER concatenate user-supplied strings into the SQL body.
//   4. All user-supplied values are bound as parameters via Prisma.sql template tags.
//      Column names are interpolated only after whitelist validation, using
//      Prisma.raw on a pre-validated string.
//
// audit-M1 boundary: every log payload carries hashed-orgId / counts / latency only.
// NEVER row content, NEVER raw column names (column ordinal index used as proxy
// when columns are referenced in cross-org-denied logs).

import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { Prisma, prisma } from '../../database/prisma'
import {
  fail,
  type InferredColumnType,
  ok,
  TABULAR_QUERY_DEFAULT_LIMIT,
  TABULAR_QUERY_MAX_LIMIT,
  type TabularAggregateFn,
  type TabularFilterOp,
  type TabularQueryInput,
  TabularQueryInputSchema,
  type TabularQueryResult,
  type ToolResult,
} from '../../types'

const FILTER_OP_SQL: Readonly<Record<TabularFilterOp, string>> = {
  eq: '=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  contains: 'ILIKE', // value side wrapped with %...% at bind time
}

const AGGREGATE_FN_SQL: Readonly<Record<TabularAggregateFn, string>> = {
  count: 'COUNT',
  sum: 'SUM',
  avg: 'AVG',
  min: 'MIN',
  max: 'MAX',
}

const NUMERIC_AGGREGATES: ReadonlySet<TabularAggregateFn> = new Set(['sum', 'avg', 'min', 'max'])

function hashOrgId(orgId: string): string {
  return createHash('sha256').update(orgId).digest('hex').slice(0, 12)
}

// Even after whitelist match, an attacker-controlled CSV header could inject a
// column name like `data); DROP TABLE--`. Whitelist alone wouldn't catch it,
// because the malicious header is what got persisted to tabular_columns.name.
// The only place column names hit raw SQL (vs parameter binding) is the
// SELECT alias / GROUP BY clause via Prisma.raw — so we gate Prisma.raw use
// on a strict safe-identifier regex. Names that don't match are rejected.
// Allowed: ASCII letters, digits, underscore, space, dash, period.
const SAFE_COLUMN_NAME_RE = /^[A-Za-z0-9_ \-.]+$/
function safeRawColumnName(name: string): string {
  if (!SAFE_COLUMN_NAME_RE.test(name)) {
    throw new Error(`unsafe column name rejected at SQL composition: ${name.slice(0, 30)}`)
  }
  return `"${name.replace(/"/g, '""')}"`
}

// Strip currency symbols + thousands separators inside SQL before ::numeric
// cast. Mirrors stripCurrencyForNumber() in infer-column-types.ts — both
// sides MUST agree on the strip set or aggregate queries will silently fail
// on real-world POS data ("£2,284.04" → 2284.04).
// Using a Postgres regex char class. NULLIF() catches all-stripped values
// (e.g. "£") so they cast to NULL instead of throwing.
function castJsonbToNumeric(col: string) {
  return Prisma.sql`NULLIF(regexp_replace(data->>${col}, '[£$€¥,\\s]', '', 'g'), '')::numeric`
}

@Injectable()
export class TabularQueryService {
  private readonly logger = new Logger(TabularQueryService.name)

  async query(orgId: string, rawInput: unknown): Promise<ToolResult<TabularQueryResult>> {
    const startedAt = Date.now()
    const orgIdHash = hashOrgId(orgId)

    // 1. Zod-validate the input shape.
    const parsed = TabularQueryInputSchema.safeParse(rawInput)
    if (!parsed.success) {
      return fail('invalid-input', parsed.error.issues.map((i) => i.message).join('; '))
    }
    const input = parsed.data as TabularQueryInput

    // 2. Tenant guard. Existence + org match in one query — never split (race-safe).
    const ki = await prisma.knowledgeItem.findFirst({
      where: { id: input.docId, organizationId: orgId },
      select: { id: true },
    })
    if (!ki) {
      this.logger.warn(
        JSON.stringify({
          level: 'warn',
          event: 'tabular.cross_org_denied',
          orgIdHash,
          docId: input.docId,
        }),
      )
      return fail('not-found', 'unknown doc id for this organization')
    }

    // 3. Column whitelist from tabular_columns for the doc.
    const columnRows = await prisma.tabularColumn.findMany({
      where: { docId: input.docId },
      select: { name: true, inferredType: true },
    })
    if (columnRows.length === 0) {
      // Doc exists but has no tabular_rows persistence (non-CSV/XLSX, or pre-Phase-5).
      return fail('not-supported', 'doc is not tabular')
    }
    const typeByName = new Map<string, InferredColumnType>(
      columnRows.map((c) => [c.name, c.inferredType as InferredColumnType]),
    )
    // Fuzzy column resolution — the agent often guesses snake_case or
    // lowercased variants ("product_name", "net sales", "items_sold") when
    // the source columns are display-cased ("Product Name", "Items Sold").
    // Normalize on lookup so trivial casing/whitespace/underscore differences
    // resolve to the canonical column name. Order matters: build the map
    // before any validation runs, then rewrite input.* in place to canonical
    // names so downstream SQL composition uses the real column.
    const normaliseColumnKey = (s: string) =>
      s
        .toLowerCase()
        .replace(/[_\s]+/g, ' ')
        .trim()
    const canonicalByNormalised = new Map<string, string>()
    for (const c of columnRows) {
      const key = normaliseColumnKey(c.name)
      if (!canonicalByNormalised.has(key)) canonicalByNormalised.set(key, c.name)
    }
    const availableColumns = columnRows.map((c) => c.name).join(', ')
    const resolveColumn = (raw: string): string | null => {
      if (typeByName.has(raw)) return raw
      return canonicalByNormalised.get(normaliseColumnKey(raw)) ?? null
    }

    // 4. Validate every column reference upfront. Whitelist + safe-identifier
    // gate (the latter blocks injection via attacker-controlled CSV headers).
    // Resolve fuzzy matches up-front and rewrite input.* so the rest of the
    // function deals only with canonical column names.
    const referencedColumns = new Set<string>()
    if (input.filters) {
      for (const f of input.filters) {
        const resolved = resolveColumn(f.column)
        if (!resolved) {
          return fail(
            'invalid-input',
            `unknown column: ${f.column}. Available: ${availableColumns}`,
          )
        }
        f.column = resolved
        referencedColumns.add(resolved)
      }
    }
    if (input.groupBy) {
      const resolved = resolveColumn(input.groupBy)
      if (!resolved) {
        return fail(
          'invalid-input',
          `unknown groupBy column: ${input.groupBy}. Available: ${availableColumns}`,
        )
      }
      input.groupBy = resolved
      referencedColumns.add(resolved)
    }
    if (input.aggregate?.column) {
      const resolved = resolveColumn(input.aggregate.column)
      if (!resolved) {
        return fail(
          'invalid-input',
          `unknown aggregate column: ${input.aggregate.column}. Available: ${availableColumns}`,
        )
      }
      input.aggregate.column = resolved
      referencedColumns.add(resolved)
    }
    if (input.sort) {
      const isMagic = input.sort.column === '_aggregate' || input.sort.column === '_row_index'
      if (!isMagic) {
        const resolved = resolveColumn(input.sort.column)
        if (!resolved) {
          return fail(
            'invalid-input',
            `unknown sort column: ${input.sort.column}. Available: ${availableColumns}`,
          )
        }
        input.sort.column = resolved
        referencedColumns.add(resolved)
      }
      if (input.sort.column === '_aggregate' && !input.aggregate) {
        return fail('invalid-input', '_aggregate sort requires an aggregate')
      }
    }
    for (const c of referencedColumns) {
      if (!SAFE_COLUMN_NAME_RE.test(c)) {
        return fail('invalid-input', `column name not safe for SQL: ${c.slice(0, 30)}`)
      }
    }

    // 5. Numeric-aggregate gate. sum/avg/min/max require inferredType='number'.
    if (input.aggregate && NUMERIC_AGGREGATES.has(input.aggregate.fn)) {
      const aggCol = input.aggregate.column
      if (!aggCol) {
        return fail('invalid-input', `aggregate fn ${input.aggregate.fn} requires a column`)
      }
      const t = typeByName.get(aggCol)
      if (t !== 'number') {
        return fail(
          'invalid-input',
          `aggregate fn ${input.aggregate.fn} requires a numeric column (got ${t} for ${aggCol})`,
        )
      }
    }

    // 6. Compose SQL. All column names are interpolated via Prisma.raw AFTER
    // whitelist validation; all user-supplied values flow through Prisma.sql binds.
    const direction = input.sort?.direction ?? 'asc'
    const directionFragment = direction === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`

    const limit = Math.min(input.limit ?? TABULAR_QUERY_DEFAULT_LIMIT, TABULAR_QUERY_MAX_LIMIT)
    const fetchLimit = limit + 1 // Probe for truncated flag without a 2nd query.

    const filterFragments: Prisma.Sql[] =
      input.filters?.map((f) => {
        const col = f.column
        const colType = typeByName.get(col) ?? 'string'
        const opSql = FILTER_OP_SQL[f.op]
        if (f.op === 'contains') {
          return Prisma.sql`(data->>${col}) ILIKE ${`%${String(f.value)}%`}`
        }
        // Numeric ops on numeric columns get JSONB→numeric cast (currency-stripped);
        // otherwise text comparison.
        if (
          colType === 'number' &&
          (f.op === 'gt' || f.op === 'lt' || f.op === 'gte' || f.op === 'lte' || f.op === 'eq')
        ) {
          return Prisma.sql`${castJsonbToNumeric(col)} ${Prisma.raw(opSql)} ${Number(f.value)}`
        }
        return Prisma.sql`(data->>${col}) ${Prisma.raw(opSql)} ${String(f.value)}`
      }) ?? []
    const filterClause =
      filterFragments.length > 0
        ? Prisma.sql` AND ${Prisma.join(filterFragments, ' AND ')}`
        : Prisma.empty

    let queryRows: Array<Record<string, unknown>>
    let aggregateBranch: 'enumeration' | 'group-aggregate' | 'aggregate-only'

    if (input.aggregate && input.groupBy) {
      aggregateBranch = 'group-aggregate'
      const fnSql = AGGREGATE_FN_SQL[input.aggregate.fn]
      const groupCol = input.groupBy
      const aggExpr =
        input.aggregate.fn === 'count'
          ? Prisma.sql`COUNT(*)::numeric`
          : Prisma.sql`${Prisma.raw(fnSql)}(${castJsonbToNumeric(input.aggregate.column!)})`

      const groupColAlias = Prisma.raw(safeRawColumnName(groupCol))
      // Group by the SELECT alias (Postgres extension) instead of repeating
      // (data->>$N) — repeated parameter bindings are distinct slots in PG's
      // parser even when the value is identical, which makes
      // `GROUP BY (data->>$3)` vs `SELECT (data->>$1)` look like different
      // expressions and triggers 42803 ("column tr.data must appear in GROUP BY").
      const sortColRef = input.sort
        ? input.sort.column === '_aggregate'
          ? Prisma.sql`_aggregate`
          : input.sort.column === '_row_index'
            ? Prisma.sql`MIN(tr."rowIndex")`
            : Prisma.sql`MIN((data->>${input.sort.column}))`
        : Prisma.sql`${groupColAlias}` // default: stable group-by alphabetical

      queryRows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
        Prisma.sql`SELECT (data->>${groupCol}) AS ${groupColAlias}, ${aggExpr} AS _aggregate
                   FROM tabular_rows tr
                   JOIN knowledge_items ki ON tr."docId" = ki.id
                   WHERE ki."organizationId" = ${orgId}
                     AND tr."docId" = ${input.docId}${filterClause}
                   GROUP BY ${groupColAlias}
                   ORDER BY ${sortColRef} ${directionFragment}, ${groupColAlias} ASC
                   LIMIT ${fetchLimit}`,
      )
    } else if (input.aggregate) {
      aggregateBranch = 'aggregate-only'
      const fnSql = AGGREGATE_FN_SQL[input.aggregate.fn]
      const aggExpr =
        input.aggregate.fn === 'count'
          ? Prisma.sql`COUNT(*)::numeric`
          : Prisma.sql`${Prisma.raw(fnSql)}(${castJsonbToNumeric(input.aggregate.column!)})`

      queryRows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
        Prisma.sql`SELECT ${aggExpr} AS _aggregate
                   FROM tabular_rows tr
                   JOIN knowledge_items ki ON tr."docId" = ki.id
                   WHERE ki."organizationId" = ${orgId}
                     AND tr."docId" = ${input.docId}${filterClause}`,
      )
    } else {
      aggregateBranch = 'enumeration'
      // Default to source-row order when no sort is specified — this is the
      // enumeration shape ("list all opening steps") that AC-6 calls out.
      const sortFragment = input.sort
        ? input.sort.column === '_row_index'
          ? Prisma.sql`tr."rowIndex" ${directionFragment}`
          : input.sort.column === '_aggregate'
            ? Prisma.sql`tr."rowIndex" ASC` // unreachable per validation, but keep deterministic
            : typeByName.get(input.sort.column) === 'number'
              ? Prisma.sql`(data->>${input.sort.column})::numeric ${directionFragment}, tr."rowIndex" ASC`
              : Prisma.sql`(data->>${input.sort.column}) ${directionFragment}, tr."rowIndex" ASC`
        : Prisma.sql`tr."rowIndex" ASC`

      queryRows = await prisma.$queryRaw<Array<Record<string, unknown>>>(
        Prisma.sql`SELECT data
                   FROM tabular_rows tr
                   JOIN knowledge_items ki ON tr."docId" = ki.id
                   WHERE ki."organizationId" = ${orgId}
                     AND tr."docId" = ${input.docId}${filterClause}
                   ORDER BY ${sortFragment}
                   LIMIT ${fetchLimit}`,
      )
    }

    const truncated = queryRows.length > limit
    const rows = (truncated ? queryRows.slice(0, limit) : queryRows).map((r) => {
      // For enumeration, the SELECT projects `data` JSONB → expand it into a
      // flat row dict the tool consumer expects.
      if (aggregateBranch === 'enumeration' && r.data && typeof r.data === 'object') {
        const expanded = r.data as Record<string, string>
        return Object.fromEntries(
          Object.entries(expanded).map(([k, v]) => [k, typeof v === 'string' ? v : String(v)]),
        )
      }
      // Aggregate branches: _aggregate is numeric (Postgres returns it as string for
      // numeric type — coerce). Group key stays the source string.
      if (typeof r._aggregate === 'string' && /^-?\d+(\.\d+)?$/.test(r._aggregate)) {
        return { ...r, _aggregate: Number(r._aggregate) } as Record<string, string | number | null>
      }
      return r as Record<string, string | number | null>
    })

    this.logger.log(
      JSON.stringify({
        level: 'info',
        event: 'tabular.queried',
        orgIdHash,
        docId: input.docId,
        branch: aggregateBranch,
        filterCount: input.filters?.length ?? 0,
        rowsReturned: rows.length,
        truncated,
        latencyMs: Date.now() - startedAt,
      }),
    )

    return ok({ rows, rowCount: rows.length, truncated })
  }
}
