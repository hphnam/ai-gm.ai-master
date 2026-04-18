# GM AI

## What This Is

A multi-venue operations assistant for hospitality businesses (pubs, bars, restaurants). Staff and managers interact via a chat interface to ask about stock levels, ordering, SOPs, equipment troubleshooting, and supplier contacts. The AI reasons over live database data and retrieves relevant documents via semantic search — not keyword matching. WhatsApp is the long-term target channel; the AI/API layer is being built first.

## Core Value

Hospitality staff and managers can get instant, accurate answers about stock, ordering, procedures, equipment, and contacts — like having a knowledgeable GM available 24/7 via chat.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.0.0 |
| Status | Phase 2 complete — ready for Phase 3 (Retrieval Layer) |
| Last Updated | 2026-04-18 |

## Requirements

### Core Features

- Answer stock and ordering questions using live database data (stock levels, par levels, usage rates, purchase orders)
- Answer procedural questions by retrieving relevant SOP documents via semantic search
- Answer equipment troubleshooting questions from embedded SOP content
- Answer contact/supplier questions (who to call, order cutoffs, etc.)
- Multi-turn conversation with full context maintained across turns

### Validated (Shipped)
- Monorepo scaffold — Turborepo v2 + pnpm workspaces; apps/api (NestJS on :3001, CORS on), apps/web (Next.js 16 on :3000); packages/config, packages/database, packages/types. (Phase 1, Plan 01-01 — 2026-04-18)
- Prisma schema with pgvector — full 9-model schema (PAUL.md §4.2) applied to NeonDB; `vector(1024)` columns live on `StockItem.embedding` and `SopDocument.embedding`; typed PrismaClient singleton (lazy Proxy, PrismaPg adapter) exported from @gm-ai/database. (Phase 1, Plan 01-02 — 2026-04-18)
- EmbeddingsService — Voyage AI wrapper with embedText/embedDocument/embedDocuments exposed via NestJS EmbeddingsModule; live-verified 1024-dim vectors, query vs document input paths distinguished. (Phase 2, Plan 02-01 — 2026-04-18)
- Seeder with Claude enrichment — `pnpm seed` loads 2 venues, 5 suppliers, 7 categories, 24 stock items, 6 SOPs (each Claude-enriched with aiSummary + aiTags), 4 contacts; all stock and SOPs have 1024-dim pgvector embeddings; fully idempotent. (Phase 2, Plan 02-02 — 2026-04-18)

### Active (In Progress)
None yet.

### Planned (Next)
- Retrieval service (vector search)
- Chat service + system prompt construction
- Chat controller (REST API)
- Basic Next.js chat UI (shadcn/ui)

### Out of Scope
- Auth / multi-tenancy (post-POC)
- BullMQ queues (post-POC)
- WhatsApp integration (post-POC)
- Intent classification step (embedding similarity handles routing)

## Constraints

### Technical Constraints
- NeonDB with pgvector for vector storage — Prisma requires `$executeRaw` for vector writes
- Voyage AI `voyage-3` produces 1024-dimension vectors
- Claude `claude-sonnet-4-6` for chat and SOP enrichment, no streaming in POC
- All Zod schemas in `packages/types`, Prisma client from `packages/database`
- Never hardcode package versions in package.json
- Use `@nestjs/bullmq` — never legacy `@nestjs/bull`

### Business Constraints
- POC stage — prove AI behaviour before building auth, multi-tenancy, queues
- Two seed venues: "The Crown" (Preston), "The Anchor Bar" (Liverpool)

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Voyage AI for embeddings | Anthropic-recommended, voyage-3 strong for domain-specific retrieval | 2026-04-13 | Active |
| Semantic retrieval over keyword search | "How do I fix the ice machine" has no exact keyword match in SOP titles | 2026-04-13 | Active |
| SOPs embedded as summary+tags+content | Pure content embedding loses title signal; hybrid text captures intent better | 2026-04-13 | Active |
| Always include below-par stock in prompt | GM should proactively know what needs ordering without being asked | 2026-04-13 | Active |
| Persist retrieved IDs per message | Enables future evals — did the AI retrieve the right docs? | 2026-04-13 | Active |
| No intent classification step | Let embedding similarity handle retrieval routing — simpler at POC stage | 2026-04-13 | Active |
| Full conversation history per call | Claude has no memory between calls — required for multi-turn context | 2026-04-13 | Active |
| Coolify on Hetzner for deployment | Standard deployment target | 2026-04-13 | Active |
| Prisma 7 with driver-adapter pattern | `latest` resolved to v7 which removed `url` from schema; PrismaPg + prisma.config.ts adopted to keep "never hardcode versions" constraint intact | 2026-04-18 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Stock queries return accurate data | Correct stock levels, par status, supplier info | - | Not started |
| SOP retrieval returns relevant docs | Top-3 semantically matched docs answer the question | - | Not started |
| Multi-turn context maintained | Follow-up questions resolve correctly | - | Not started |
| Equipment troubleshooting works | Error codes and procedures retrieved accurately | - | Not started |
| Contact queries return correct info | Right person/number for the situation | - | Not started |

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Monorepo | Turborepo | pnpm workspaces |
| API | NestJS (latest) | Standard module structure |
| ORM | Prisma | Generated from packages/database |
| Database | NeonDB (Postgres + pgvector) | 1024-dim vectors |
| Queue | BullMQ + Redis | Post-POC |
| Auth | better-auth (org plugin) | Post-POC |
| AI Chat | Anthropic SDK — Claude `claude-sonnet-4-6` | |
| AI Embeddings | Voyage AI — voyage-3 | 1024 dimensions |
| Validation | Zod | Shared from packages/types |
| Frontend | Next.js (App Router) + shadcn/ui | |
| Deployment | Coolify on Hetzner | |

---
*Created: 2026-04-13*
