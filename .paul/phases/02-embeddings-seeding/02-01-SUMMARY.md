---
phase: 02-embeddings-seeding
plan: 01
subsystem: ai-embeddings
tags: [voyage-ai, embeddings, nestjs-module, dotenv, tsx-probe]

requires:
  - phase: 01-project-foundation (Plan 01-01)
    provides: "apps/api NestJS scaffold with bootstrap + CORS"
  - phase: 01-project-foundation (Plan 01-02)
    provides: "(not used in this plan — kept as phase dependency for completeness)"
provides:
  - "EmbeddingsService — typed wrapper over VoyageAIClient with embedText / embedDocument / embedDocuments"
  - "EmbeddingsModule — NestJS module exporting EmbeddingsService to future consumers"
  - "repo-root .env loaded at api bootstrap via dotenv"
  - "probe:embeddings — tsx-run live verification script (pnpm --filter api probe:embeddings)"
affects: [02-02-seeder, 03-retrieval, 04-chat]

tech-stack:
  added: [voyageai, dotenv, tsx]
  patterns:
    - "Single Voyage entry-point — every vector in the project flows through EmbeddingsService; no direct voyageai imports elsewhere (enforced by boundary grep)"
    - "OnModuleInit for client construction — env vars are guaranteed loaded before client instantiation"
    - "dotenv loaded at api bootstrap before any other import (explicit path to repo-root .env, same pattern as prisma.config.ts in Plan 01-02)"
    - "tsx-run probe script pattern — dev-only verification that exercises a service class without a full NestJS bootstrap"

key-files:
  created:
    - apps/api/src/modules/embeddings/embeddings.module.ts
    - apps/api/src/modules/embeddings/embeddings.service.ts
    - apps/api/scripts/probe-embeddings.ts
  modified:
    - apps/api/src/main.ts (dotenv preload)
    - apps/api/src/app.module.ts (+EmbeddingsModule)
    - apps/api/package.json (+voyageai, dotenv, tsx; +probe:embeddings script)

key-decisions:
  - "VoyageAIClient (named export), not the default import shown in PAUL.md §6 — matched to actual voyageai@0.2.x SDK shape"
  - "No @nestjs/config for POC — dotenv at bootstrap is sufficient; add ConfigModule only if testing or multi-env story demands it"
  - "Probe via tsx script, not a NestJS test or HTTP endpoint — minimal surface for verification, trivially removable/replaceable"
  - "Package versions kept as \"latest\" per PROJECT.md — corrected after `pnpm add` inserted caret pins"

patterns-established:
  - "NestJS module pattern — single-responsibility service, module re-exports it, AppModule imports the module. Template for 02-02 SeedModule, 03-retrieval RetrievalModule, 04-chat ChatModule."
  - "Probe scripts live in apps/api/scripts/ and run via tsx; scripts section in package.json (`probe:*`) exposes them"
  - "Error handling: throw at onModuleInit if required env is missing — fail fast at boot rather than producing confusing runtime errors later"

duration: ~15min
started: 2026-04-18T11:52:00Z
completed: 2026-04-18T12:07:00Z
---

# Phase 2 Plan 01: EmbeddingsService (Voyage AI wrapper) Summary

**NestJS EmbeddingsModule exposing a VoyageAIClient wrapper with embedText (query), embedDocument (single), and embedDocuments (batch) — all returning 1024-dim number[] from voyage-3. Live probe confirmed all six correctness checks against the Voyage API.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15min |
| Started | 2026-04-18T11:52:00Z |
| Completed | 2026-04-18T12:07:00Z |
| Tasks | 2 of 2 completed |
| Files modified | 6 (3 created, 3 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Environment variables load at api bootstrap | Pass | `main.ts` loads `.env` from repo root (`../../../.env` via `__dirname`) before NestFactory; probe confirms `VOYAGE_API_KEY` reaches EmbeddingsService |
| AC-2: embedText returns 1024-dim vector from voyage-3 | Pass | Probe: "✓ embedText dim = 1024" + "✓ embedText is finite numbers" |
| AC-3: query vs document inputType distinguished | Pass | Probe: "✓ query != document vector" — same text `"how do I fix the ice machine"` embedded as query produces a different vector than the doc example embedded as document |
| AC-4: Module wired into AppModule and exports EmbeddingsService | Pass | `app.module.ts` imports EmbeddingsModule; EmbeddingsModule has `exports: [EmbeddingsService]`; `pnpm -r build` passes end-to-end |

## Accomplishments

- Vector pipeline is live — Phase 2 Plan 02-02 (seeder) can now `imports: [EmbeddingsModule]` and call `embedDocuments(texts)` to batch-embed SOPs and stock items before writing them to the `vector(1024)` columns
- Single Voyage entry-point enforced via boundary — future plans that try to import `voyageai` directly will fail the boundary grep and be routed back through EmbeddingsService
- Repo-root `.env` convention extended from prisma.config.ts (Plan 01-02) to the api runtime — one `.env` serves prisma migrations, prisma runtime, api bootstrap, and probe scripts
- NestJS module pattern established — the shape (service, module, providers/exports, imports in AppModule) is ready to copy for SeedModule, RetrievalModule, ChatModule

## Task Commits

Per-plan atomic commit policy active from this plan onward.

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1 + Task 2 (combined) | *pending Plan 02-01 commit* | feat | EmbeddingsService + module + bootstrap env loading + live probe |

Combined into a single commit because both tasks deliver the same atomic feature (Voyage AI wrapper verified against the live API); splitting would produce a non-verifiable intermediate state.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `apps/api/src/main.ts` | Modified | `dotenv` `config({ path: resolve(__dirname, '../../../.env') })` prepended before any other import |
| `apps/api/src/app.module.ts` | Modified | `imports: [EmbeddingsModule]` added |
| `apps/api/src/modules/embeddings/embeddings.module.ts` | Created | Module with `providers: [EmbeddingsService]`, `exports: [EmbeddingsService]` |
| `apps/api/src/modules/embeddings/embeddings.service.ts` | Created | OnModuleInit constructs VoyageAIClient from `VOYAGE_API_KEY`; throws if unset. Three methods (embedText, embedDocument, embedDocuments) all call `client.embed({ model: 'voyage-3', input, inputType })` |
| `apps/api/scripts/probe-embeddings.ts` | Created | Six-check tsx probe that instantiates EmbeddingsService manually, exercises all three methods against live Voyage API, asserts 1024-dim + finiteness + query≠doc |
| `apps/api/package.json` | Modified | +deps: `voyageai`, `dotenv`; +devDep: `tsx`; +script: `probe:embeddings` → `tsx scripts/probe-embeddings.ts`; all deps normalized to `"latest"` after `pnpm add` caret-pinned them |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **Named import `VoyageAIClient`** (not `VoyageAI` default) | voyageai@0.2.x exports `VoyageAIClient` as named; PAUL.md §6's `import VoyageAI from 'voyageai'` pattern predates this SDK version. Verified via npmjs + github.com/voyage-ai/typescript-sdk before planning | PAUL.md §6 is now spec-divergent on this line; any later plan that copies from §6 verbatim will have the same issue — flagged in STATE.md decisions |
| **No @nestjs/config module** | For POC, dotenv at bootstrap + `process.env.X` reads are simpler and trivially testable. ConfigService adds DI ceremony without unlocking anything we need now | If multi-env (staging/prod env files) becomes a real concern, switch to @nestjs/config in its own plan — single-file migration |
| **OnModuleInit for client construction** | Constructor-time reads of `process.env` have caused issues in testing frameworks that construct providers before env is loaded. OnModuleInit runs AFTER Nest finishes wiring modules and env is guaranteed present | Pattern to copy for RetrievalService (Phase 3) and ChatService (Phase 4) — same VOYAGE_API_KEY / DATABASE_URL / ANTHROPIC_API_KEY fail-fast story |
| **Probe via standalone tsx script** | Simplest possible live verification — no Nest bootstrap, no HTTP surface to clean up later, no test framework to install. Script stays in-tree as a dev utility | probe:embeddings remains useful during Phase 2/3 development if Voyage key issues resurface |
| **Package versions pinned to `"latest"`** (re-normalized) | PROJECT.md technical constraint — `pnpm add <pkg>` inserts caret pins by default, reverted to `"latest"` manually | Future `pnpm add` calls will need same manual correction (or `.npmrc` config with `save-prefix=""`) — logged as follow-up |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 (version pins → "latest") | Complied with PROJECT.md constraint |
| Scope additions | 0 | - |
| Deferred | 0 | - |

**Total impact:** Plan executed as written; one pnpm-add side effect (caret pins) reverted during execution.

### Auto-fixed Issues

**1. [Tooling] pnpm add inserted caret version pins**
- **Found during:** Task 1 immediately after `pnpm --filter api add voyageai dotenv` and `pnpm --filter api add -D tsx`
- **Issue:** pnpm saved `"voyageai": "^0.2.1"`, `"dotenv": "^17.4.2"`, `"tsx": "^4.21.0"` — violates PROJECT.md "Never hardcode package versions in package.json"
- **Fix:** Edited `apps/api/package.json` to set all four (voyageai, dotenv, tsx, plus a couple of pre-existing pins I found) back to `"latest"`
- **Files:** apps/api/package.json
- **Verification:** `pnpm -r build` still succeeds — "latest" resolution produces the same versions because lockfile unchanged
- **Commit:** (this plan's commit)

### Deferred Items

- **pnpm save-prefix config** — `pnpm add` will keep inserting caret pins until `.npmrc` sets `save-prefix=""` or a commit hook enforces "latest" pins. Not critical; logged for a future tooling pass.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| PAUL.md §6 shows `import VoyageAI from 'voyageai'` which doesn't match the v0.2.x SDK | Researched upstream SDK before planning; plan specified correct `import { VoyageAIClient } from 'voyageai'` shape — zero in-flight surprises |

## Next Phase Readiness

**Ready:**
- EmbeddingsService importable by Plan 02-02 SeedModule — pattern: `imports: [EmbeddingsModule]`, then inject `EmbeddingsService`
- Batch method (`embedDocuments`) is the right shape for the seeder's bulk SOP/stock embedding pass
- Live Voyage path exercised end-to-end — Plan 02-02 doesn't need to debug connectivity; only wire the seeder on top

**Concerns:**
- Voyage rate limits not tested — batch size in Plan 02-02 should stay ≤128 items per call (Voyage-3 batch cap) to avoid 429s; if seeder emits larger batches, chunking logic lives in the seeder, not in EmbeddingsService (service stays thin)
- No retry/backoff on Voyage errors — transient network blips will surface as seeder crashes; acceptable for POC, add resilience in a post-launch plan

**Blockers:**
- None

---
*Phase: 02-embeddings-seeding, Plan: 01*
*Completed: 2026-04-18*
