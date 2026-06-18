---
phase: 01-project-foundation
plan: 01
subsystem: infra
tags: [turborepo, pnpm, nestjs, nextjs, typescript, tailwind-v4, prisma-placeholder, zod]

requires:
  - phase: (none)
    provides: first phase
provides:
  - Turborepo v2 monorepo (pnpm workspaces)
  - apps/api — NestJS scaffold (port 3001, CORS enabled, health endpoint)
  - apps/web — Next.js 16 App Router scaffold (port 3000, Tailwind v4)
  - packages/config — shared tsconfig base (strict, NodeNext)
  - packages/database — @gm-ai/database placeholder (Prisma deps installed; schema arrives in 01-02)
  - packages/types — @gm-ai/types with Zod healthCheckSchema
affects: [01-02-schema, 02-embeddings, 03-retrieval, 04-chat, 05-web]

tech-stack:
  added: [turbo, pnpm workspaces, @nestjs/core, @nestjs/common, @nestjs/platform-express, reflect-metadata, rxjs, next, react, react-dom, tailwindcss v4, @tailwindcss/postcss, zod, prisma, @prisma/client]
  patterns:
    - "Workspace protocol for internal packages (@gm-ai/*: workspace:*)"
    - "Shared tsconfig base extended by each package/app"
    - "Next.js transpilePackages for untranspiled workspace imports"
    - "Tailwind v4 CSS-first configuration (no tailwind.config.ts)"

key-files:
  created:
    - package.json (root)
    - turbo.json
    - pnpm-workspace.yaml
    - .npmrc
    - apps/api/src/main.ts
    - apps/api/src/app.controller.ts
    - apps/web/src/app/page.tsx
    - packages/types/src/index.ts
    - packages/config/tsconfig.base.json

key-decisions:
  - "Tailwind v4 CSS-first instead of spec's tailwind.config.ts — v4 is config-less"
  - "apps/api uses CommonJS/Node10 moduleResolution (not NodeNext base) — NestJS decorator requirement"
  - "@gm-ai/types consumed as source (main: src/index.ts) — transpiled at app build time, no intermediate dist"

patterns-established:
  - "Shared types flow: packages/types → consumed by api and web (via transpilePackages for Next)"
  - "API health pattern: controller returns typed shape from @gm-ai/types"
  - "CORS enabled at bootstrap so web can call api in later phases"

duration: ~45min
started: 2026-04-13T21:18:00Z
completed: 2026-04-18T11:11:00Z
---

# Phase 1 Plan 01: Monorepo Scaffold Summary

**Turborepo v2 monorepo with NestJS API on :3001, Next.js 16 web on :3000, and shared workspace packages (@gm-ai/config, @gm-ai/database, @gm-ai/types). All four acceptance criteria pass end-to-end.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45min (spanning 2 sessions) |
| Started | 2026-04-13T21:18:00Z |
| Completed | 2026-04-18T11:11:00Z |
| Tasks | 3 of 3 completed |
| Files modified | ~25 (see table below) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Monorepo installs and builds | Pass | `pnpm install` clean; `pnpm build` → 4 successful, 4 total (turbo 2.9.6) |
| AC-2: NestJS API starts on :3001 | Pass | `Nest application successfully started`; `GET /` → 200 `{"status":"ok","timestamp":"..."}` |
| AC-3: Next.js web starts on :3000 | Pass | Next.js 16.2.3 (Turbopack); `GET /` → 200 renders "GM AI" + "Chat coming soon" |
| AC-4: Shared packages are importable | Pass | `apps/api/src/app.controller.ts` imports `HealthCheck` from `@gm-ai/types`; TypeScript resolves cleanly |

## Accomplishments

- Monorepo boots cleanly with one command (`pnpm install`) — no peer-dep warnings that block install, no postinstall failures that block dev
- API returns a typed response sourced from shared package — validates the workspace type flow that every subsequent phase depends on
- Web app renders through Turbopack on Next.js 16 with Tailwind v4 CSS-first setup (modern config, no legacy JS config file)
- Phase 2+ can start layering schema and services into a stable scaffold

## Task Commits

No atomic commits were made during this plan — scaffold was built in a previous session before git was initialized for GSD-style atomic commits. Will be captured in phase transition commit when Plan 01-02 completes.

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Root monorepo configuration | (deferred to phase commit) | feat | Root package.json, turbo.json, pnpm-workspace, .npmrc, .gitignore, .env.example |
| Task 2: NestJS API + shared packages | (deferred to phase commit) | feat | apps/api, packages/config, packages/database (placeholder), packages/types |
| Task 3: Next.js web app | (deferred to phase commit) | feat | apps/web with Tailwind v4, next.config with transpilePackages |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `package.json` | Created | Root workspace, pnpm@10.4.1, engines node>=20, turbo scripts |
| `.npmrc` | Created | `auto-install-peers=true`, `strict-peer-dependencies=false` (NestJS pnpm compat) |
| `pnpm-workspace.yaml` | Created | `apps/*`, `packages/*` |
| `turbo.json` | Created | v2 `tasks` key — build deps on ^build, dev persistent, lint independent |
| `.gitignore` | Created | node_modules, dist, .next, .env, .turbo, prisma generated client |
| `.env.example` | Created | DATABASE_URL, ANTHROPIC_API_KEY, VOYAGE_API_KEY, REDIS_URL, NODE_ENV, PORT |
| `apps/api/package.json` | Created | @nestjs/core/common/platform-express, reflect-metadata, rxjs, workspace deps |
| `apps/api/tsconfig.json` | Created | Extends config base; overrides to CommonJS/Node10/ES2022 for NestJS |
| `apps/api/nest-cli.json` | Created | sourceRoot: src, deleteOutDir |
| `apps/api/src/main.ts` | Created | NestFactory bootstrap, `app.enableCors()`, listen on PORT ?? 3001 |
| `apps/api/src/app.module.ts` | Created | AppModule with AppController |
| `apps/api/src/app.controller.ts` | Created | `GET /` returns typed HealthCheck from @gm-ai/types |
| `apps/web/package.json` | Created | next, react, react-dom, tailwindcss v4, @tailwindcss/postcss, @gm-ai/types |
| `apps/web/tsconfig.json` | Created | Next.js paths, bundler resolution, next plugin |
| `apps/web/next.config.ts` | Created | `transpilePackages: ['@gm-ai/types']` |
| `apps/web/postcss.config.mjs` | Created | `@tailwindcss/postcss` plugin (v4 postcss integration) |
| `apps/web/src/app/layout.tsx` | Created | Root HTML shell, imports globals.css, metadata |
| `apps/web/src/app/page.tsx` | Created | Minimal home: "GM AI" + "Chat coming soon" |
| `apps/web/src/app/globals.css` | Created | `@import "tailwindcss"` (v4 entry) |
| `packages/config/package.json` | Created | @gm-ai/config private package |
| `packages/config/tsconfig.base.json` | Created | Strict, NodeNext, ES2022, declaration + sourceMap |
| `packages/database/package.json` | Created | @gm-ai/database with prisma + @prisma/client deps |
| `packages/database/tsconfig.json` | Created | Extends config base |
| `packages/database/src/index.ts` | Created | Placeholder export (schema arrives 01-02) |
| `packages/types/package.json` | Created | @gm-ai/types with zod dep; main/types point to src/index.ts |
| `packages/types/tsconfig.json` | Created | Extends config base |
| `packages/types/src/index.ts` | Created | Exports `healthCheckSchema` (Zod) and `HealthCheck` type |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Tailwind v4 CSS-first (no tailwind.config.ts) | v4 configures via CSS `@import "tailwindcss"` + optional `@theme` block. Adding a JS config file would be cargo-culting. | None on output; simpler config surface. |
| apps/api tsconfig overrides base to CommonJS + Node10 | NestJS decorators and `reflect-metadata` require CommonJS emit. NodeNext ESM caused runtime decorator errors (memory 2904, 2026-04-14). | Self-contained to API app; other packages stay on NodeNext. |
| `@gm-ai/types` consumed as source | `main: src/index.ts` + Next `transpilePackages` + NestJS CommonJS compilation both handle TypeScript source directly. Avoids build coupling between packages. | No `dist/` needed in type packages; faster iteration. |
| Pin `packageManager: pnpm@10.4.1` | Prevents node version drift; Corepack respects this pin. | Reproducible installs across dev + CI. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Spec vs. actual mismatch | 1 | No impact on ACs — Tailwind v4 genuinely doesn't use JS config |
| Scope additions | 0 | - |
| Deferred | 0 | - |

**Total impact:** Plan executed as intended; one spec artifact (`tailwind.config.ts`) replaced by Tailwind v4's CSS-first equivalent (`globals.css` + `postcss.config.mjs`).

### Auto-fixed Issues

**1. [Tooling] NestJS TypeScript compilation errors**
- **Found during:** Task 2 (API + shared packages) in prior session (2026-04-14)
- **Issue:** Decorator metadata emission failed with NodeNext module resolution
- **Fix:** Overrode `apps/api/tsconfig.json` to `module: CommonJS`, `moduleResolution: Node10`, added `emitDecoratorMetadata` + `experimentalDecorators`
- **Files:** apps/api/tsconfig.json
- **Verification:** `pnpm build` succeeds; `nest start` boots cleanly
- **Commit:** (captured in phase transition commit)

### Deferred Items

None deferred as unresolved issues. Pre-existing deferred issues (ESLint, Husky, CI/CD, Docker) were logged during audit and remain in STATE.md.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| pnpm ignored build scripts warning (@nestjs/core, @prisma/engines, prisma, sharp) | Not blocking. Will run `pnpm approve-builds` when Plan 01-02 needs `prisma generate`. |
| pnpm 10.4.1 → 10.33.0 update available | Not blocking this plan. Tooling upgrade decision belongs in its own plan. |

## Next Phase Readiness

**Ready:**
- Stable monorepo scaffold for Plan 01-02 (Prisma schema + pgvector migration)
- `packages/database` is ready to receive `prisma/schema.prisma` and generated client
- Workspace type flow validated — @gm-ai/types can be expanded with domain Zod schemas from Phase 4 onward
- API health endpoint provides a simple smoke test after every future plan

**Concerns:**
- `pnpm approve-builds` will be needed when Plan 01-02 runs `prisma generate` — anticipate prompt
- No ESLint/Prettier yet — deferred to a later tooling plan; do not block schema/embedding work on it

**Blockers:**
- None

---
*Phase: 01-project-foundation, Plan: 01*
*Completed: 2026-04-18*
