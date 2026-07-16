import { AsyncLocalStorage } from 'node:async_hooks'
import { isVenueScoped, type VenueScope } from '../modules/auth/venue-scope'

// Per-request venue scope, carried implicitly so DB queries don't each have to
// thread it. OrgContextMiddleware sets it from the resolved membership. Background
// jobs / cron / system code run with NO store → treated as unscoped (full access),
// which is correct — only interactive requests by a venue-scoped member are narrowed.
//
// IMPORTANT: Prisma invokes an extension's `query` hook in a DETACHED async
// context, so `getStore()` is NOT visible inside the hook. We therefore capture
// the scope in the extension's CLOSURE (`venueScopeExtension(scope)`) and build a
// per-request extended client — the store here only carries the scope + a cached
// scoped client to the `prisma` proxy, which resolves it at property-access time
// (that DOES run inside the request's ALS context). See database/prisma.ts.
type VenueRequestContext = { scope: VenueScope; client?: unknown }

const store = new AsyncLocalStorage<VenueRequestContext>()

export function runWithVenueContext<T>(scope: VenueScope, fn: () => T): T {
  return store.run({ scope }, fn)
}

export function getVenueRequestContext(): VenueRequestContext | undefined {
  return store.getStore()
}

// Which client a `prisma` property access should resolve to for the CURRENT
// request: the per-request venue-scoped (extended) client for a scoped member,
// else the un-extended base client. Called by the `prisma` proxy at access time,
// which runs inside the request's ALS context (unlike Prisma's own hook). The
// scoped client is built once per request and cached on the context.
export function resolveClientForRequest<T extends object>(base: T): T {
  if (process.env.VENUE_CONTEXT_DISABLED === '1') return base
  const ctx = store.getStore()
  if (!ctx || !isVenueScoped(ctx.scope)) return base
  if (!ctx.client) {
    ctx.client = (base as { $extends: (ext: unknown) => unknown }).$extends(
      venueScopeExtension(ctx.scope),
    )
  }
  return ctx.client as T
}

// Which models carry a venue and how. `orgWideVisible` models have a nullable
// venue column whose NULL rows are org-wide (visible to everyone); the rest are
// always venue-bound. `Venue` itself is keyed by `id`, not `venueId`.
type ScopedModelConfig = { field: 'venueId' | 'id'; orgWideVisible: boolean }

const SCOPED_MODELS: Record<string, ScopedModelConfig> = {
  Task: { field: 'venueId', orgWideVisible: true },
  Report: { field: 'venueId', orgWideVisible: true },
  ScheduledReport: { field: 'venueId', orgWideVisible: true },
  ExpiryRecord: { field: 'venueId', orgWideVisible: true },
  KnowledgeItem: { field: 'venueId', orgWideVisible: true },
  IncidentLog: { field: 'venueId', orgWideVisible: false },
  PricingRecommendation: { field: 'venueId', orgWideVisible: false },
  VenueContact: { field: 'venueId', orgWideVisible: false },
  ChatConversation: { field: 'venueId', orgWideVisible: false },
  MockStock: { field: 'venueId', orgWideVisible: false },
  MockPurchaseOrder: { field: 'venueId', orgWideVisible: false },
  Venue: { field: 'id', orgWideVisible: false },
}

export class VenueScopeViolationError extends Error {
  constructor(readonly model: string) {
    super(`write to a venue outside the caller's scope (${model})`)
    this.name = 'VenueScopeViolationError'
  }
}

// The WHERE fragment that narrows an op to the scoped member's venues. Pure so
// it can be unit-tested without a DB. `forWrite` drops the org-wide (null-venue)
// rows: a scoped member may READ org-wide rows but must not bulk-mutate them.
export function buildVenueScopeWhere(
  cfg: ScopedModelConfig,
  venueIds: string[],
  forWrite = false,
): Record<string, unknown> {
  const inFilter = { [cfg.field]: { in: venueIds } }
  if (cfg.orgWideVisible && !forWrite) return { OR: [{ [cfg.field]: null }, inFilter] }
  return inFilter
}

function mergeWhere(existing: unknown, scoped: Record<string, unknown>): Record<string, unknown> {
  if (existing && typeof existing === 'object') return { AND: [existing, scoped] }
  return scoped
}

// Does a row this operation would write/return sit inside the scope? Used for
// findUnique post-filtering and create validation, where a WHERE can't be added.
function rowInScope(
  cfg: ScopedModelConfig,
  venueIds: string[],
  row: Record<string, unknown> | null | undefined,
): boolean {
  if (!row) return true
  const value = row[cfg.field]
  if (value == null) return cfg.orgWideVisible
  return typeof value === 'string' && venueIds.includes(value)
}

const READ_WHERE_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
])
// Bulk writes take an arbitrary `where` — narrow it (strict: no org-wide rows).
const BULK_WRITE_OPS = new Set(['updateMany', 'deleteMany', 'updateManyAndReturn'])
// Single writes take a WhereUniqueInput, which (Prisma 4.5+) also accepts extra
// non-unique filters — so the scope is pushed down and an out-of-scope target
// simply matches nothing (Prisma throws P2025 → the caller's not-found path).
const UNIQUE_WRITE_OPS = new Set(['update', 'delete'])
const CREATE_MANY_OPS = new Set(['createMany', 'createManyAndReturn'])

// Prisma client extension that enforces a FIXED venue scope (captured in this
// closure) on every model op. Build one per request via database/prisma.ts only
// when the caller is venue-scoped; owners / unscoped members / system code use
// the un-extended client and are never narrowed.
export function venueScopeExtension(scope: VenueScope) {
  const venueIds = scope.venueIds
  return {
    name: 'venue-scope',
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string
          operation: string
          args: Record<string, unknown>
          query: (args: Record<string, unknown>) => Promise<unknown>
        }): Promise<unknown> {
          const cfg = SCOPED_MODELS[model]
          if (!cfg) return query(args)

          if (READ_WHERE_OPS.has(operation)) {
            args.where = mergeWhere(args.where, buildVenueScopeWhere(cfg, venueIds))
            return query(args)
          }
          if (BULK_WRITE_OPS.has(operation)) {
            args.where = mergeWhere(args.where, buildVenueScopeWhere(cfg, venueIds, true))
            return query(args)
          }

          // Single reads by unique key: org-wide rows stay visible, so filter the
          // returned row rather than a strict where (a null-venue row is in scope).
          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            const row = (await query(args)) as Record<string, unknown> | null
            if (rowInScope(cfg, venueIds, row)) return row
            if (operation === 'findUniqueOrThrow') throw new VenueScopeViolationError(model)
            return null
          }

          // Single writes by unique key: push a STRICT venue filter into the
          // unique where so an out-of-scope target matches nothing.
          if (UNIQUE_WRITE_OPS.has(operation)) {
            args.where = scopeUniqueWhere(cfg, venueIds, model, args.where)
            return query(args)
          }

          // Creates: reject any row that EXPLICITLY pins to an out-of-scope venue.
          // Only meaningful for the `venueId` foreign-key models — the Venue model
          // is keyed by its own `id`, and a not-yet-created venue can't be "in
          // scope", so creating a Venue is left to the role gate.
          if (cfg.field === 'venueId') {
            if (operation === 'create') {
              assertDataInScope(cfg, venueIds, model, args.data)
              return query(args)
            }
            if (operation === 'upsert') {
              args.where = scopeUniqueWhere(cfg, venueIds, model, args.where)
              assertDataInScope(cfg, venueIds, model, args.create)
              return query(args)
            }
            if (CREATE_MANY_OPS.has(operation)) {
              const data = args.data
              for (const row of Array.isArray(data) ? data : [data]) {
                assertDataInScope(cfg, venueIds, model, row)
              }
              return query(args)
            }
          }

          return query(args)
        },
      },
    },
  }
}

// Narrow a WhereUniqueInput for a single update/delete/upsert. For venueId-keyed
// models the scope is added as a sibling filter (the unique field is separate, so
// no collision). For the Venue model the unique `id` IS the scope key, so a
// sibling filter would clash — pre-reject an out-of-scope target instead.
function scopeUniqueWhere(
  cfg: ScopedModelConfig,
  venueIds: string[],
  model: string,
  where: unknown,
): Record<string, unknown> {
  const base = (where && typeof where === 'object' ? where : {}) as Record<string, unknown>
  if (cfg.field === 'venueId') {
    return { ...base, venueId: { in: venueIds } }
  }
  const id = base.id
  if (typeof id === 'string' && !venueIds.includes(id)) {
    throw new VenueScopeViolationError(model)
  }
  return base
}

// Reject a create only when it EXPLICITLY pins the row to a venue outside scope.
// An absent/null venueId is left alone — Prisma enforces required columns, and
// org-wide (null) rows on nullable models are a legitimate write.
function assertDataInScope(
  cfg: ScopedModelConfig,
  venueIds: string[],
  model: string,
  data: unknown,
): void {
  if (!data || typeof data !== 'object') return
  const value = (data as Record<string, unknown>)[cfg.field]
  if (typeof value === 'string' && !venueIds.includes(value)) {
    throw new VenueScopeViolationError(model)
  }
}
