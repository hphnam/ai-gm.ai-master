# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-13)

**Core value:** Hospitality staff and managers can get instant, accurate answers about stock, ordering, procedures, equipment, and contacts — like having a knowledgeable GM available 24/7 via chat.
**Current focus:** Phase 2 complete — ready for Phase 3 (Retrieval Layer)

## Current Position

Milestone: v0.1 POC (v0.1.0)
Phase: 2 of 5 (Embeddings & Seeding) — **Complete**
Plan: 02-02 loop closed (UNIFY complete)
Status: Phase 2 complete; ready for Phase 3 planning
Last activity: 2026-04-18 12:35 — Plan 02-02 UNIFY complete; Phase 2 closed

Progress:
- Milestone: [████░░░░░░] 40% (4 of 10 plans complete)
- Phase 1: [██████████] 100% ✓ (committed 51af306)
- Phase 2: [██████████] 100% ✓ (02-01 = 88ab109; 02-02 commit pending)
- Phase 3: [░░░░░░░░░░] 0% (planning pending)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 2 complete — ready for Phase 3 PLAN]
```

## Accumulated Context

### Decisions
- Implementation order defined in PAUL.md (Section 12): scaffold → schema → embeddings → seeder → retrieval → chat → controller → UI
- POC scope excludes auth, multi-tenancy, BullMQ queues
- 5-phase roadmap: Foundation → Embeddings & Seeding → Retrieval → Chat Engine → Web Interface
- Enterprise audit on 01-01: Applied 4 strongly-recommended upgrades (.npmrc, CORS, Turborepo v2 format, frontmatter completeness). Deferred 4 (ESLint, CI/CD, Husky, Docker). Verdict: enterprise-ready.
- 2026-04-18: Plan 01-01 APPLY — Tailwind v4 CSS-first used instead of spec's tailwind.config.ts. Phase 1 | Impact: none, AC-3 satisfied via @tailwindcss/postcss + CSS import.
- 2026-04-18: Plan 01-01 APPLY — apps/api/tsconfig.json overrides base to CommonJS/Node10 (required for NestJS decorator compilation). Phase 1 | Impact: none, build passes.
- 2026-04-18: Plan 01-02 — Adopted Prisma 7 (driver-adapter + prisma.config.ts) rather than pinning to v6. User-chosen option B. Phase 1 | Impact: PAUL.md §4.2 datasource adapted (no `url`); all future DB access goes through PrismaPg adapter.
- 2026-04-18: Plan 01-02 — Driver chosen: @prisma/adapter-pg (not @prisma/adapter-neon) for environment portability. Phase 1 | Impact: NeonDB + local Docker pgvector both work without adapter swap.
- 2026-04-18: Plan 01-02 — No NestJS PrismaService for POC — direct `import { prisma } from '@gm-ai/database'`. Phase 1 | Impact: introduce PrismaService in Phase 2+ only if DI lifecycle benefits show up.
- 2026-04-18: Plan 02-01 — voyageai v0.2.x uses named export `VoyageAIClient` (not default import shown in PAUL.md §6). Phase 2 | Impact: any later plan copying from PAUL.md §6 must convert the import; flagged for audit.
- 2026-04-18: Plan 02-01 — No @nestjs/config for POC — dotenv at bootstrap suffices. Phase 2 | Impact: single-file migration to ConfigService if multi-env concerns surface later.
- 2026-04-18: Plan 02-01 — Probe scripts pattern — apps/api/scripts/*.ts run via tsx, exposed as `probe:*` npm scripts. Phase 2 | Impact: same pattern for future live-API verification (Claude, retrieval).
- 2026-04-18: Plan 02-02 — Workspace packages with runtime exports must compile to dist/ (not main: src/*.ts). Phase 2 | Impact: @gm-ai/database now has dist/; @gm-ai/types will need same treatment when Phase 4 consumes its Zod schemas at runtime.
- 2026-04-18: Plan 02-02 — Lazy Prisma singleton via Proxy in @gm-ai/database. Phase 2 | Impact: import order no longer couples to env loading; any context (CLI, test, serverless) can load env at any time.
- 2026-04-18: Plan 02-02 — CLI commands run via `nest build && node dist/...` (not tsx) because esbuild doesn't emit emitDecoratorMetadata. Phase 2 | Impact: all nest-commander CLIs pay a ~5s build tax; DI works correctly.
- 2026-04-18: Plan 02-02 — Deterministic seed UUIDs (d0000000-*, e0000000-*). Phase 2 | Impact: Phase 3 retrieval test fixtures can hardcode IDs like Carlsberg Lager=d0000000-0000-4000-8000-000000000001.

### Deferred Issues
- ESLint/Prettier setup (deferred from audit — add in dedicated plan or Phase 5)
- Husky/lint-staged pre-commit hooks (depends on ESLint)
- CI/CD pipeline (post-POC)
- Docker configuration (post-POC)
- Prisma `migrate deploy` strategy for production (out of POC scope; add pre-launch plan)
- Prisma query logging (`log: ['query']`) — add in dev config if Phase 3/4 needs debug visibility
- `pnpm approve-builds` — **RESOLVED** in Plan 01-02 via `pnpm.onlyBuiltDependencies`
- pnpm `save-prefix` — `pnpm add` inserts caret pins; manually reverted to `"latest"` in 02-01 and 02-02. Add `.npmrc save-prefix=""` in a future tooling plan so this enforces automatically.
- **Claude model deprecation** — `claude-sonnet-4-20250514` reaches end-of-life 2026-06-15. PROJECT.md pins this model. Need tooling plan before that date: (a) choose successor, (b) update PROJECT.md, (c) update EnrichmentService + ChatService strings.
- pg v9 SSL semantics change — `sslmode=require` behaviour changes in pg v9. Non-breaking for now; revisit pre-production.
- Incremental build cache for nest-commander CLIs — `pnpm seed` rebuilds the api from scratch (~5s). Optimisation candidate once we have more CLIs.

### Blockers/Concerns
None yet.

## Session Continuity

Last session: 2026-04-18 12:35
Stopped at: Phase 2 complete (both plans UNIFY ✓); commit pending
Next action: Commit Plan 02-02; then /paul:plan for Phase 3 (Retrieval Layer — Plan 03-01)
Resume file: .paul/phases/02-embeddings-seeding/02-02-SUMMARY.md

---
*STATE.md — Updated after every significant action*
