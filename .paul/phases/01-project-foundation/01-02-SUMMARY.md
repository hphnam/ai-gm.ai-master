---
phase: 01-project-foundation
plan: 02
subsystem: database
tags: [prisma, prisma-7, pgvector, postgresql, neondb, driver-adapter, migrations]

requires:
  - phase: 01-project-foundation (Plan 01-01)
    provides: "@gm-ai/database package shell, root monorepo scaffold"
provides:
  - "Full Prisma schema (9 models) matching PAUL.md §4.2"
  - "pgvector extension enabled in NeonDB"
  - "Initial migration (20260418103508_init) with CREATE EXTENSION vector + 10 tables"
  - "Typed PrismaClient singleton exported from @gm-ai/database (via PrismaPg adapter)"
  - "prisma.config.ts pattern for v7 (dotenv-loaded DATABASE_URL from repo root)"
affects: [02-embeddings-seeding, 03-retrieval, 04-chat-engine, 05-web-interface]

tech-stack:
  added: ["@prisma/adapter-pg", "pg", "@types/pg", "dotenv"]
  patterns:
    - "Prisma 7 driver-adapter pattern — PrismaClient({ adapter: new PrismaPg({ connectionString }) })"
    - "DATABASE_URL loaded via dotenv in prisma.config.ts (explicit path to repo root)"
    - "Globalized prisma singleton to prevent hot-reload connection exhaustion"
    - "pnpm.onlyBuiltDependencies allowlist for postinstall scripts (non-interactive approve-builds)"
    - "@gm-ai/database re-exports `@prisma/client` namespace so consumers import everything from one place"

key-files:
  created:
    - packages/database/prisma/schema.prisma
    - packages/database/prisma.config.ts
    - packages/database/prisma/migrations/20260418103508_init/migration.sql
  modified:
    - packages/database/src/index.ts (placeholder → typed singleton)
    - packages/database/package.json (+adapter deps, build → prisma generate)
    - package.json (root) (+pnpm.onlyBuiltDependencies)

key-decisions:
  - "Adopted Prisma 7 (not pinned to v6) — accepted driver-adapter + prisma.config.ts mechanics as the new canonical pattern"
  - "Driver adapter: @prisma/adapter-pg over @prisma/adapter-neon — keeps pg driver swappable if Neon is ever replaced"
  - "dotenv loaded explicitly in prisma.config.ts (not prisma's built-in) so root .env works when CLI runs from packages/database"
  - "Did NOT introduce a NestJS PrismaService — api imports `prisma` directly from @gm-ai/database for POC; service wrapper can arrive in Phase 2 if DI wiring benefits show up"

patterns-established:
  - "Workspace database access — any app imports `{ prisma }` from `@gm-ai/database`; no direct `@prisma/client` imports elsewhere"
  - "Migration shape — generate via `prisma migrate dev --name <name>` against the live dev DB (NeonDB); no shadow DB needed yet"
  - "pgvector columns — declared as Unsupported(\"vector(1024)\") in Prisma, written/read via `$executeRaw` / `$queryRaw` in Phase 2+"

duration: ~35min
started: 2026-04-18T11:12:00Z
completed: 2026-04-18T11:40:00Z
---

# Phase 1 Plan 02: Prisma schema + pgvector migration Summary

**Full 9-model Prisma schema applied to NeonDB with pgvector extension enabled; typed PrismaClient singleton exported via @gm-ai/database. Adopted Prisma 7's driver-adapter + prisma.config.ts pattern (decision B).**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~35min (including Prisma 7 migration detour + user DATABASE_URL checkpoint) |
| Started | 2026-04-18T11:12:00Z |
| Completed | 2026-04-18T11:40:00Z |
| Tasks | 3 of 3 completed |
| Files modified | 6 (3 created, 3 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Schema validates and matches PAUL.md §4.2 | Pass | `prisma validate` → "The schema at prisma/schema.prisma is valid"; all 9 models present |
| AC-2: pgvector extension enabled via migration | Pass | `migration.sql` includes `CREATE EXTENSION IF NOT EXISTS "vector"`; migration applied to NeonDB `neondb.public` |
| AC-3: Initial migration applies cleanly with vector columns | Pass | 10 tables created (9 models + implicit `_prisma_migrations`); `StockItem.embedding` and `SopDocument.embedding` typed as `vector(1024)` (verified via migration SQL grep) |
| AC-4: Prisma client is importable with full typing | Pass | `pnpm -r build` → 5 successful; TypeScript probe confirmed `prisma.venue`, `prisma.stockItem`, `prisma.sopDocument`, `prisma.chatMessage` + types `Venue`, `StockItem`, `SopDocument` + `Prisma` namespace all resolve from `@gm-ai/database` |

## Accomplishments

- Full domain data model live in NeonDB — every subsequent phase (Phase 2 seeder, Phase 3 retrieval, Phase 4 chat, Phase 5 web) has a real schema to read/write against
- pgvector infrastructure validated — not just "installed" but exercised via Prisma's `Unsupported("vector(1024)")` → actual `vector(1024)` column in Postgres. This is what Phase 2's `$executeRaw` vector writes will land in
- Prisma 7 pattern established for the entire project — future plans know exactly how schema + client + migrations interact under the new driver-adapter model, avoiding repeated debugging
- `pnpm approve-builds` friction removed — `onlyBuiltDependencies` in root package.json unblocks postinstall scripts for prisma + nestjs without interactive prompts

## Task Commits

Atomic commits were not made during this plan (pre-existing repo state — this GSD/PAUL project hadn't initialized git atomic-commit discipline before Phase 1). All Plan 01-02 work will be captured in the Phase 1 transition commit.

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Schema + singleton + approve-builds | (phase commit) | feat | PAUL.md §4.2 schema; Prisma 7 prisma.config.ts; PrismaPg-backed singleton; root pnpm.onlyBuiltDependencies |
| Task 2: Human checkpoint — DATABASE_URL | n/a | n/a | User-provided NeonDB connection string |
| Task 3: Initial migration + vector verification | (phase commit) | feat | `prisma migrate dev --name init` applied to NeonDB; migration SQL + first migration entry |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `packages/database/prisma/schema.prisma` | Created | 9 Prisma models matching PAUL.md §4.2 verbatim; `extensions = [vector]`; `previewFeatures = ["postgresqlExtensions"]`; `url` omitted (moved to config.ts per Prisma 7) |
| `packages/database/prisma.config.ts` | Created | Loads `.env` from repo root via `dotenv`; exposes `DATABASE_URL` to Prisma CLI via `env("DATABASE_URL")` |
| `packages/database/prisma/migrations/20260418103508_init/migration.sql` | Created | `CREATE EXTENSION IF NOT EXISTS "vector"` + all 10 `CREATE TABLE` + `CREATE INDEX` statements + FK constraints |
| `packages/database/prisma/migrations/migration_lock.toml` | Created | Prisma-managed migration provider lock |
| `packages/database/src/index.ts` | Modified | Placeholder → typed PrismaClient singleton wrapped in PrismaPg adapter; re-exports `@prisma/client` namespace |
| `packages/database/package.json` | Modified | `build` script → `prisma generate`; added deps: `@prisma/adapter-pg`, `pg`; dev deps: `@types/pg`, `dotenv` |
| `package.json` (root) | Modified | Added `pnpm.onlyBuiltDependencies: ["@prisma/client","@prisma/engines","prisma","@nestjs/core"]` — non-interactive approve-builds |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **Adopt Prisma 7 rather than pin to v6** (user-chosen option B) | Accepts new driver-adapter + config.ts mechanics; avoids violating PROJECT.md "never hardcode package versions"; forward-compatible | All future plans use prisma.config.ts + PrismaPg; PAUL.md §4.2 datasource block adapted (no `url` line) |
| `@prisma/adapter-pg` over `@prisma/adapter-neon` | `pg` is the generic Postgres driver — works against NeonDB today and any Postgres+pgvector tomorrow. Neon-specific adapter would couple us tighter to Neon | Single adapter covers NeonDB prod + local Docker pgvector dev; no adapter swap when env changes |
| Load `.env` via explicit `resolve(__dirname, '../../.env')` in prisma.config.ts | Prisma CLI runs from `packages/database/`, but `.env` lives at repo root. Default dotenv `.env` lookup finds nothing in that cwd; explicit path makes it work from any invocation location | Prisma CLI works reliably from package dir; no need to `cd` to root first |
| No NestJS `PrismaService` yet | POC scope — direct `import { prisma } from '@gm-ai/database'` is simpler and equally correct; DI wiring adds ceremony before we need it | Phase 2+ can introduce PrismaService if request-scoped transactions or lifecycle hooks show benefit |
| `pnpm.onlyBuiltDependencies` allowlist | Prefer declarative allowlist over interactive `pnpm approve-builds` — survives fresh clones and CI | All future contributors get a clean `pnpm install` without a postinstall approval prompt |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Spec rewrite (Prisma 7 migration) | 1 major | Changed Task 1 file set but delivered same ACs. User approved change via checkpoint. |
| Config location fix | 1 | dotenv path change — made Prisma CLI work from package subdir |
| Auto-fixed | 0 | - |
| Scope additions | 0 | - |
| Deferred | 0 | - |

**Total impact:** Plan shape stayed intact — 3 tasks, 4 ACs, all met. Internal mechanics of Task 1 diverged from the original instructions because pnpm resolved Prisma to v7 (which removed `url` from schema and requires a driver adapter). User chose option B (adopt Prisma 7), which reshaped Task 1 in flight.

### Auto-fixed Issues

**1. [Tooling] Prisma 7 config mechanics**
- **Found during:** Task 1 (first `prisma validate` run)
- **Issue:** Prisma CLI 7.7.0 rejects `url = env("DATABASE_URL")` in `datasource` block; requires `prisma.config.ts` + driver adapter
- **Fix:** Created `packages/database/prisma.config.ts` with dotenv-loaded `env('DATABASE_URL')`; added `@prisma/adapter-pg` + `pg`; rewrote singleton to `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
- **Files:** `packages/database/prisma/schema.prisma`, `packages/database/prisma.config.ts` (new), `packages/database/src/index.ts`, `packages/database/package.json`
- **Verification:** `prisma validate` returns valid; `prisma migrate dev` applies successfully
- **User decision:** Option B (adopt v7) accepted at mid-task checkpoint

**2. [Config] Prisma config didn't find `.env`**
- **Found during:** Task 2 follow-through (first `prisma db execute` probe)
- **Issue:** `import 'dotenv/config'` at default config loaded `.env` from CLI cwd (`packages/database`), not repo root
- **Fix:** Replaced with `config({ path: resolve(__dirname, '../../.env') })` to pin lookup to repo root
- **Files:** `packages/database/prisma.config.ts`
- **Verification:** `prisma db execute` connected to NeonDB successfully

### Deferred Items

None deferred as unresolved. Pre-existing STATE.md deferred items (ESLint, Husky, CI/CD, Docker) remain in place for a future tooling plan.

The `pnpm approve-builds` warning that was flagged as a "concern" in 01-01-SUMMARY is now **resolved** via `pnpm.onlyBuiltDependencies`.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Prisma 7 `url` removal broke PAUL.md §4.2 verbatim copy | Escalated to user as Spec issue → option B (adopt v7) chosen → Task 1 reshaped accordingly |
| `prisma.config.ts` ate `DATABASE_URL` missing error at `validate` time | Supplied placeholder env var for validate; real env used for migrate |
| dotenv default path didn't resolve repo-root `.env` when CLI ran from `packages/database` | Explicit `path: resolve(__dirname, '../../.env')` |

## Next Phase Readiness

**Ready:**
- Live schema with typed client, queryable via `prisma.venue.findMany()` etc.
- `$executeRaw` / `$queryRaw` paths are the documented pgvector access pattern — Phase 2 (seeding) and Phase 3 (retrieval) can use them directly
- `@gm-ai/database` is the one-stop import for any app in the monorepo
- `.env` is wired up; Phase 2's embeddings service will add `VOYAGE_API_KEY` to the same file

**Concerns:**
- No seeder yet — an empty database is fine for the schema plan, but Phase 2 must land first before retrieval/chat can be exercised
- `migrate dev` assumes a dev DATABASE_URL; a production deployment story (`migrate deploy` in CI) is **not** in scope for POC and will need its own plan pre-launch
- No Prisma logging config yet — if query debugging becomes necessary in Phase 3/4, add `log: ['query']` in dev

**Blockers:**
- None

---
*Phase: 01-project-foundation, Plan: 02*
*Completed: 2026-04-18*
