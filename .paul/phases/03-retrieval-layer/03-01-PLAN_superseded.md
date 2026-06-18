---
phase: 03-retrieval-layer
plan: 01
type: execute
wave: 1
depends_on: ["02-01", "02-02"]
files_modified:
  - apps/api/src/modules/retrieval/retrieval.service.ts
  - apps/api/src/modules/retrieval/retrieval.module.ts
  - apps/api/src/modules/retrieval/retrieval.types.ts
  - apps/api/src/app.module.ts
  - apps/api/scripts/probe-retrieval.ts
  - apps/api/package.json
autonomous: true
---

<objective>
## Goal
Build a NestJS `RetrievalService` that performs cosine-similarity vector search against the seeded `SopDocument` and `StockItem` rows in NeonDB, plus a live probe that proves it returns semantically relevant results.

## Purpose
Retrieval is the bridge between "user typed a question" and "Claude has the right context". Without it, the Chat Engine (Phase 4) has nothing to put in the system prompt, and the POC's core promise — "like having a knowledgeable GM via chat" — does not work. This plan delivers the two query methods the Chat Engine will call before every response.

## Output
- `RetrievalService` exposing `findRelevantSops` and `findRelevantStockItems`, with input validation and typed error surfaces <!-- audit-added -->
- `RetrievalModule` registered in `AppModule` (no cross-module imports — service depends only on the shared prisma singleton) <!-- audit-modified -->
- Probe script `pnpm probe:retrieval` that runs real queries against seeded data and prints top matches with similarity scores + per-query latency
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work (directly consumed by this plan)
@.paul/phases/02-embeddings-seeding/02-01-SUMMARY.md
@.paul/phases/02-embeddings-seeding/02-02-SUMMARY.md

## Source Files
@apps/api/src/modules/embeddings/embeddings.service.ts
@apps/api/src/modules/embeddings/embeddings.module.ts
@apps/api/src/modules/seed/seed.command.ts
@apps/api/src/app.module.ts
@apps/api/src/load-env.ts
@apps/api/scripts/probe-embeddings.ts
@packages/database/prisma/schema.prisma
@packages/database/src/index.ts

## Specification Reference
@PAUL.md §8.1 and §8.2 — approximate shape of queries (note: §8 uses snake_case table/column names and `this.prisma` injection; this plan must use PascalCase quoted identifiers and the shared `prisma` singleton from `@gm-ai/database`, consistent with the seeder in 02-02)
</context>

<skills>
## Required Skills

No `.paul/SPECIAL-FLOWS.md` configured for this project — skills section omitted.
</skills>

<acceptance_criteria>

## AC-1: SOP semantic retrieval returns venue-scoped + global matches, ordered by similarity
```gherkin
Given the database contains seeded SopDocument rows, some with venueId = "The Crown" and some with venueId = NULL (global)
And each has a 1024-dim embedding populated
When RetrievalService.findRelevantSops(queryEmbedding, venueId="<Crown.id>", limit=3) is invoked
Then the result is an array of at most 3 SopDocument rows
And every returned row has either venueId = "<Crown.id>" OR venueId = NULL
And rows are ordered by cosine distance ascending (most similar first)
And each row includes id, title, category, content, aiSummary, aiTags, and a numeric similarity field in [0, 1]
```

## AC-2: Stock semantic retrieval returns venue-scoped matches with computed fields
```gherkin
Given the database contains seeded StockItem rows for "The Crown"
And each has a 1024-dim embedding populated
When RetrievalService.findRelevantStockItems(queryEmbedding, venueId="<Crown.id>", limit=5) is invoked
Then the result is an array of at most 5 rows
And every returned row has venueId = "<Crown.id>"
And each row includes the StockItem columns plus categoryName, supplierName, leadTimeDays, weeksRemaining, stockStatus (one of OUT_OF_STOCK, BELOW_PAR, OVERSTOCKED, OK), and a numeric similarity in [0, 1]
And rows are ordered by cosine distance ascending (most similar first)
```

## AC-3: Live probe confirms semantic relevance on real queries
```gherkin
Given the seeded database from plan 02-02
When `pnpm probe:retrieval` is executed
Then for query "how do I reset the ice machine" the top SOP result is the SOP whose title references the ice machine (Scotsman reset)
And for query "running low on lager" at least one of the top 3 stock results is a lager product with stockStatus BELOW_PAR or OUT_OF_STOCK
And every successful retrieval call completes in < 2000 ms against the seeded corpus
And all checks print and the process exits 0
```

<!-- audit-added: AC-4 -->
## AC-4: Malformed inputs are rejected before reaching the database
```gherkin
Given RetrievalService is constructed
When findRelevantSops or findRelevantStockItems is called with:
  - venueId that is not a valid UUID, or
  - queryEmbedding whose length != 1024, or
  - queryEmbedding containing any non-finite value (NaN, Infinity, non-number), or
  - limit <= 0 or limit > the per-method cap (50 for SOP, 100 for stock)
Then the method throws a RetrievalError with a clear message
And no SQL query is sent to the database
```

<!-- audit-added: AC-5 -->
## AC-5: Numeric fields return as JS numbers, ordering is deterministic
```gherkin
Given successful retrieval calls against seeded data
When the result rows are inspected
Then Decimal-backed fields (currentQty, parLevel, reorderQty, costPerUnit, avgWeeklyUsage, weeksRemaining) are typed as number (or null where nullable), NOT as Prisma.Decimal instances or strings
And similarity is typed as number in [0, 1]
And two calls with identical inputs return rows in the same order (secondary sort by id breaks distance ties)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create RetrievalService with typed query methods</name>
  <files>apps/api/src/modules/retrieval/retrieval.service.ts, apps/api/src/modules/retrieval/retrieval.types.ts</files>
  <action>
    Create `retrieval.types.ts` defining:
      - `SopRetrievalResult` — { id, title, category, content, aiSummary: string | null, aiTags: string[], similarity: number, venueId: string | null }
      - `StockRetrievalResult` — StockItem-shaped fields as returned by the SQL below (camelCase) + categoryName, supplierName (string | null), leadTimeDays (number | null), weeksRemaining (number | null), stockStatus ('OUT_OF_STOCK' | 'BELOW_PAR' | 'OVERSTOCKED' | 'OK'), similarity: number
      - <!-- audit-added --> `RetrievalError` — exported class extending `Error` with readonly fields: `kind: 'sop' | 'stock'`, `reason: 'invalid-vector' | 'invalid-venue-id' | 'invalid-limit' | 'db-error'`, optional `cause: unknown`. Constructor sets `this.name = 'RetrievalError'`.
      - <!-- audit-added --> `VECTOR_DIM = 1024` and `MAX_SOP_LIMIT = 50`, `MAX_STOCK_LIMIT = 100` — exported const numeric bounds.
      - <!-- audit-added --> `UUID_V4_REGEX` — exported regex. Note: seed uses UUIDs with version nibble `4` (e.g., `d0000000-0000-4000-8000-000000000001`), so use a permissive `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` rather than a strict v4 check — deterministic seed IDs must still pass.

    Create `retrieval.service.ts`:
      - `@Injectable()` class `RetrievalService`, no `OnModuleInit` needed (prisma is lazy-loaded)
      - `import { prisma } from '@gm-ai/database'` — DO NOT inject PrismaService (per Phase 1 decision)
      - Private helper `toPgVector(v: number[]): string` that <!-- audit-modified -->:
        1. Asserts `Array.isArray(v) && v.length === VECTOR_DIM` — else `throw new RetrievalError({ kind, reason: 'invalid-vector' })` (kind is passed in or set by caller)
        2. Asserts every element is `typeof === 'number' && Number.isFinite(n)` — else throw `invalid-vector`
        3. Returns `` `[${v.join(',')}]` ``
      - <!-- audit-added --> Private helper `assertVenueId(id: string, kind): void` that throws `RetrievalError({ kind, reason: 'invalid-venue-id' })` if `!UUID_V4_REGEX.test(id)`.
      - <!-- audit-added --> Private helper `clampLimit(limit: number, max: number, kind): number` that throws `RetrievalError({ kind, reason: 'invalid-limit' })` if `!Number.isInteger(limit) || limit < 1 || limit > max`; returns `limit` otherwise.
      - `async findRelevantSops(queryEmbedding: number[], venueId: string, limit = 3): Promise<SopRetrievalResult[]>`:
        - <!-- audit-added --> Validate first: `assertVenueId(venueId, 'sop')`, `clampLimit(limit, MAX_SOP_LIMIT, 'sop')`, then `const vec = toPgVector(queryEmbedding)` (which throws on bad vector).
        - <!-- audit-added --> Wrap the DB call in try/catch. On thrown non-RetrievalError, rethrow as `new RetrievalError({ kind: 'sop', reason: 'db-error', cause })`.
        - Use `prisma.$queryRawUnsafe<SopRetrievalResult[]>(sql, vec, venueId, limit)`
        - SQL must use PascalCase quoted identifiers — the table is `"SopDocument"` (not `sop_documents`), columns are `"aiSummary"`, `"aiTags"`, `"venueId"` etc.
        - WHERE clause: `("venueId" = $2 OR "venueId" IS NULL) AND embedding IS NOT NULL`
        - Similarity expression: <!-- audit-modified --> `(1 - (embedding <=> $1::vector))::double precision AS similarity` (explicit double precision cast so Prisma returns JS `number`, not string)
        - ORDER BY: <!-- audit-modified --> `embedding <=> $1::vector ASC, id ASC` (deterministic tie-break)
        - LIMIT $3
        - Return id, title, category, content, "aiSummary", "aiTags", "venueId", similarity
        - <!-- audit-added --> After query: log debug with `{ kind: 'sop', venueId, limit, count: rows.length, topSim: rows[0]?.similarity ?? null, elapsedMs }` (no raw query text). Log warn on `rows.length === 0`.
      - `async findRelevantStockItems(queryEmbedding: number[], venueId: string, limit = 10): Promise<StockRetrievalResult[]>`:
        - <!-- audit-added --> Validate first: `assertVenueId(venueId, 'stock')`, `clampLimit(limit, MAX_STOCK_LIMIT, 'stock')`, `toPgVector`. Wrap DB call in try/catch → `RetrievalError({ kind: 'stock', reason: 'db-error' })`.
        - Use `prisma.$queryRawUnsafe<StockRetrievalResult[]>`
        - FROM `"StockItem" si JOIN "StockCategory" sc ON sc.id = si."categoryId" LEFT JOIN "Supplier" s ON s.id = si."supplierId"`
        - Computed SELECT fields (use AS aliases matching the camelCase type keys) — <!-- audit-modified --> every Decimal column is cast to `double precision` so Prisma returns `number`:
          - `sc.name AS "categoryName"`
          - `s.name AS "supplierName"`
          - `s."leadTimeDays" AS "leadTimeDays"`
          - `si."currentQty"::double precision AS "currentQty"` <!-- audit-added -->
          - `si."parLevel"::double precision AS "parLevel"` <!-- audit-added -->
          - `si."reorderQty"::double precision AS "reorderQty"` <!-- audit-added -->
          - `si."costPerUnit"::double precision AS "costPerUnit"` <!-- audit-added (nullable — ::double precision on NULL stays NULL) -->
          - `si."avgWeeklyUsage"::double precision AS "avgWeeklyUsage"` <!-- audit-added -->
          - `CASE WHEN si."avgWeeklyUsage" IS NULL OR si."avgWeeklyUsage" = 0 THEN NULL ELSE ROUND((si."currentQty" / si."avgWeeklyUsage")::numeric, 1)::double precision END AS "weeksRemaining"` <!-- audit-modified: added ::double precision at end -->
          - `CASE WHEN si."currentQty" = 0 THEN 'OUT_OF_STOCK' WHEN si."currentQty" < si."parLevel" THEN 'BELOW_PAR' WHEN si."currentQty" >= si."parLevel" * 1.5 THEN 'OVERSTOCKED' ELSE 'OK' END AS "stockStatus"`
          - `(1 - (si.embedding <=> $1::vector))::double precision AS similarity` <!-- audit-modified -->
        - Non-decimal columns: si.id, si.name, si."venueId", si.sku, si.unit, si."unitSize", si.notes
        - WHERE: `si."venueId" = $2 AND si.embedding IS NOT NULL`
        - ORDER BY: <!-- audit-modified --> `si.embedding <=> $1::vector ASC, si.id ASC`
        - LIMIT $3
        - <!-- audit-added --> Debug log as above with kind: 'stock'. Log warn on zero rows.
      - NestJS `Logger` with the service name. <!-- audit-modified --> Debug-level log on every successful retrieval; warn-level log on zero rows; error-level log before rethrowing db-error.

    Avoid: template-literal interpolation of the vector into `$queryRaw` (tagged template). Use `$queryRawUnsafe` with the stringified `[x,y,z]` passed as a positional parameter — matches the seeder pattern and avoids Prisma's vector-array binding limitation.
    Avoid: snake_case identifiers in SQL — Prisma default is quoted PascalCase tables / camelCase columns.
    Avoid: accessing prisma before env is loaded — RetrievalService is NestJS-scoped, so bootstrap already loads env before any request.
    <!-- audit-added --> Avoid: leaking raw Postgres error text through RetrievalError.message — use a fixed safe message and attach the original as `cause` (Node preserves the chain for logging without exposing DB internals).
    <!-- audit-added --> Avoid: logging `queryEmbedding` contents or full query strings — user queries may contain PII. Log only counts, venueId, timings, and top similarity.
  </action>
  <verify>`pnpm -w --filter @gm-ai/api build` compiles cleanly (swc, ~36ms) with no TS errors.</verify>
  <done>AC-1, AC-2, AC-4, AC-5 satisfied at the type + SQL + validation level (live verification happens in Task 3).</done>
</task>

<task type="auto">
  <name>Task 2: Wire RetrievalModule into AppModule</name>
  <files>apps/api/src/modules/retrieval/retrieval.module.ts, apps/api/src/app.module.ts</files>
  <action>
    Create `retrieval.module.ts`:
      - <!-- audit-modified --> `@Module` with `providers: [RetrievalService]`, `exports: [RetrievalService]`. NO `imports` — RetrievalService does not depend on EmbeddingsService (it takes an already-embedded `number[]`). Phase 4's ChatModule will import both EmbeddingsModule and RetrievalModule explicitly.

    Update `app.module.ts`:
      - Add `RetrievalModule` to `imports` (after `EmbeddingsModule`)
      - Keep existing imports/controllers intact — do not remove `AppController`
  </action>
  <verify>`pnpm -w --filter @gm-ai/api build && node -e "require('./apps/api/dist/src/app.module.js')"` loads the compiled module without throwing.</verify>
  <done>AC-1 and AC-2 satisfied at the DI-wiring level — RetrievalService is resolvable from the Nest container.</done>
</task>

<task type="auto">
  <name>Task 3: Live-verify retrieval with probe script</name>
  <files>apps/api/scripts/probe-retrieval.ts, apps/api/package.json</files>
  <action>
    Create `apps/api/scripts/probe-retrieval.ts` (follow the shape of `probe-embeddings.ts`):
      - `import '../src/load-env'` at the top
      - Instantiate `EmbeddingsService` and `RetrievalService` directly (no Nest app needed — mirrors probe-embeddings pattern); call `embeddings.onModuleInit()`
      - `import { prisma } from '@gm-ai/database'`
      - Look up The Crown's venueId: `const crown = await prisma.venue.findFirst({ where: { name: 'The Crown' } })` — assert it exists
      - Run two real queries:
        1. `const sopQuery = 'how do I reset the ice machine'` → `embedText` → `findRelevantSops(vec, crown.id, 3)`
        2. `const stockQuery = 'running low on lager'` → `embedText` → `findRelevantStockItems(vec, crown.id, 5)`
      - Print top results with similarity scores (4 decimal places)
      - <!-- audit-modified --> Time each retrieval call (`const t0 = performance.now(); ...; const elapsed = performance.now() - t0`). Capture elapsed ms per call.
      - Checks (pattern: `ReadonlyArray<readonly [name, boolean]>`):
        - `[SOP] returned >= 1 result`
        - `[SOP] all rows have venueId = crown.id OR NULL`
        - `[SOP] results ordered by similarity desc`
        - `[SOP] top result title contains "ice" (case-insensitive)` — proves semantic relevance
        - <!-- audit-added --> `[SOP] similarity values are JS numbers in [0, 1]` — proves ::double precision cast worked
        - <!-- audit-added --> `[SOP] latency < 2000ms`
        - `[Stock] returned >= 1 result`
        - `[Stock] all rows have venueId = crown.id`
        - `[Stock] stockStatus is one of known enum values`
        - `[Stock] at least one result mentions "lager" (case-insensitive) in name` — proves semantic routing
        - `[Stock] similarity ordered desc`
        - <!-- audit-added --> `[Stock] currentQty / parLevel / avgWeeklyUsage are typeof === 'number' (or null for nullable)` — proves Decimal coercion
        - <!-- audit-added --> `[Stock] latency < 2000ms`
        - <!-- audit-added -->  Three failure-path checks — each wraps the call in try/catch and asserts `err instanceof RetrievalError` with the expected `reason`:
          - `[Error] invalid venueId ("not-a-uuid") → RetrievalError reason='invalid-venue-id'`
          - `[Error] wrong-dim vector (length 10) → RetrievalError reason='invalid-vector'`
          - `[Error] limit = 9999 → RetrievalError reason='invalid-limit'`
      - Exit 1 on any failure, exit 0 on all-pass
      - `await prisma.$disconnect()` in a `finally` block

    Add to `apps/api/package.json` scripts: `"probe:retrieval": "tsx scripts/probe-retrieval.ts"` (match the existing `probe:embeddings` and `probe:seed` entries — keep alphabetical order within the probe group).
  </action>
  <verify>`pnpm --filter @gm-ai/api probe:retrieval` prints all ✓ and exits 0 against the seeded NeonDB.</verify>
  <done>AC-3, AC-4, AC-5 satisfied: live queries return semantically correct top results, validation errors surface correctly, numeric types round-trip.</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `packages/database/prisma/schema.prisma` — no schema changes in this plan (pgvector indexes are a follow-up)
- `apps/api/src/modules/embeddings/**` — EmbeddingsService API is stable
- `apps/api/src/modules/seed/**` — seeder output is the input to this plan, do not tweak it
- `apps/api/src/load-env.ts` — env loading is solved
- `.swcrc`, `tsconfig.json` — build toolchain is stable

## SCOPE LIMITS
- No always-included context (contacts, below-par-only query, emergency-contact query) — that is Plan 03-02
- No `ChatController` / `ChatService` — Phase 4
- No pgvector HNSW / IVFFlat index creation — <!-- audit-modified --> defer with explicit trigger: create index when seeded corpus exceeds 1,000 embedded rows OR p95 retrieval latency > 500ms (whichever comes first). Add entry to STATE.md Deferred Issues.
- No caching layer (Redis / in-memory) — premature at POC
- No Zod schemas for retrieval results in `packages/types` — callers (ChatService) will consume types directly; revisit in Phase 4 if the types cross an API boundary
- No unit tests — the probe is the verification; Jest setup is a separate tooling plan
- <!-- audit-added --> No Postgres `statement_timeout` on retrieval queries — acceptable at POC corpus size (<100 rows per table); add explicit statement_timeout (e.g., 3000ms) when approaching 1,000+ rows, via `prisma.$executeRaw` on connection acquire or via NestJS interceptor.
- <!-- audit-added --> No persistent audit log of retrieval calls — Phase 4 `ChatMessage.retrievedSopIds` / `retrievedStockIds` fields (already in schema) cover post-hoc reconstruction when wired in ChatService.

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `pnpm -w --filter @gm-ai/api build` passes (swc, ~36ms, no TS errors)
- [ ] `pnpm --filter @gm-ai/api probe:retrieval` exits 0 with all ✓ (including the three validation-error checks and latency bounds)
- [ ] `RetrievalModule` resolves from `AppModule` without DI errors
- [ ] Raw SQL uses PascalCase quoted identifiers (`"SopDocument"`, `"StockItem"`, `"aiTags"`, etc.) — not snake_case
- [ ] Vector param passed via `$1::vector` positional arg, not string-interpolated into the SQL
- [ ] <!-- audit-added --> Every Decimal column and computed numeric in the SQL is cast to `double precision` — confirmed by probe's `typeof === 'number'` checks
- [ ] <!-- audit-added --> `RetrievalError` class exported from `retrieval.types.ts`, thrown from all four validation paths and wrapped around db errors
- [ ] <!-- audit-added --> Both queries include `ORDER BY <distance>, id ASC` for deterministic tie-breaking
- [ ] <!-- audit-added --> `retrieval.module.ts` has no `imports` array (no EmbeddingsModule coupling)
- [ ] <!-- audit-added --> STATE.md Deferred Issues updated with the HNSW-index trigger condition and the statement_timeout follow-up
- [ ] All five acceptance criteria met
</verification>

<success_criteria>
- RetrievalService exists with `findRelevantSops` and `findRelevantStockItems`, typed return shapes
- <!-- audit-added --> Input validation (vector dim/finite, UUID venueId, bounded limit) blocks malformed calls before any DB round-trip
- <!-- audit-added --> Errors surface as `RetrievalError` with machine-readable `reason`, never as raw Prisma/pg exceptions
- <!-- audit-added --> Numeric fields round-trip as JS `number` — no Decimal objects or string values leak to callers
- RetrievalModule registered in AppModule (no spurious cross-module imports)
- Probe script proves ice-machine query returns the ice-machine SOP, lager query returns lager stock, validation errors fire correctly, and retrieval completes in < 2000 ms
- No new dependencies added (uses existing Prisma, Voyage, Nest)
- No deferred issues opened without a written entry in SUMMARY and STATE.md
</success_criteria>

<output>
After completion, create `.paul/phases/03-retrieval-layer/03-01-SUMMARY.md`
</output>
