# Roadmap: GM AI

## Overview

Build the AI/API layer for a multi-venue hospitality operations assistant. Starting from monorepo scaffold through to a working chat interface that can answer stock, SOP, equipment, and contact queries using semantic retrieval over live data.

## Current Milestone

**v0.1 POC** (v0.1.0)
Status: In progress
Phases: 4 of 5 complete
Milestone plans: ~12 (grown from 10 after Phase 3 rescoping to agentic KB)

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Project Foundation | 2 | Complete | 2026-04-18 |
| 2 | Embeddings & Seeding | 2 | Complete | 2026-04-18 |
| 3 | Agentic Knowledge Layer | 3 | Complete | 2026-04-18 |
| 4 | Chat Engine | 3 | Complete | 2026-04-18 |
| 5 | Web Interface | 2 | Not started | - |

## Phase Details

### Phase 1: Project Foundation

**Goal:** Monorepo scaffold with Turborepo + working Prisma schema with pgvector, migrated against NeonDB
**Depends on:** Nothing (first phase)
**Research:** Unlikely (standard Turborepo + Prisma setup)

**Scope:**
- Turborepo monorepo with apps/api, apps/web, packages/database, packages/types, packages/config
- NestJS API app scaffold
- Next.js web app scaffold
- Prisma schema with full data model and pgvector support
- Initial migration run

**Plans:**
- [x] 01-01: Monorepo scaffold — Turborepo, NestJS API, Next.js web, shared packages (completed 2026-04-18)
- [x] 01-02: Prisma schema and initial migration — full data model with pgvector (completed 2026-04-18)

### Phase 2: Embeddings & Seeding

**Goal:** Voyage AI embeddings service and seeder command that populates venues, stock, SOPs with embeddings
**Depends on:** Phase 1 (Prisma schema must exist)
**Research:** Likely (Voyage AI SDK, nest-commander)
**Research topics:** Voyage AI SDK usage, nest-commander setup

**Scope:**
- EmbeddingsService wrapping Voyage AI
- Seeder command using nest-commander
- Claude enrichment for SOP documents (summaries + tags)
- Embedding storage via raw SQL (pgvector)

**Plans:**
- [x] 02-01: Embeddings service — Voyage AI wrapper (completed 2026-04-18)
- [x] 02-02: Seeder command — seed data, Claude enrichment, embedding generation (completed 2026-04-18)

### Phase 3: Agentic Knowledge Layer

**Goal:** Shapeless knowledge base (KnowledgeItem with freeform `metadata Json`) + honest `mock_*` ops tables + agentic ingest + retrieval with tool-backed ops access. No type enums on knowledge; Claude classifies at ingest. Ops data lives in mock tables that mirror the shape of future Xero/Square integrations.
**Depends on:** Phase 2 (seeded data with embeddings required)
**Research:** Unlikely (pgvector cosine search + Claude tool use are well-documented)

**Scope:**
- Schema reshape to KnowledgeItem + mock_* rename + re-seed
- Agentic ingest pipeline (Claude → freeform metadata)
- Knowledge retrieval service + mock-ops tool adapters with not-found guardrail

**Plans:**
- [x] 03-01: Schema reshape — KnowledgeItem + mock_* rename + re-seed fixture (completed 2026-04-18)
- [x] 03-02: Agentic ingest pipeline — Claude-authored freeform metadata + embedding (completed 2026-04-18)
- [x] 03-03: Knowledge retrieval + mock-ops tool adapters — KnowledgeRetrievalService + MockOpsService (4 tools) + ToolResult<T> envelope (completed 2026-04-18)

### Phase 4: Chat Engine

**Goal:** Chat orchestration with Claude tool use over knowledge retrieval + mock-ops tools. Honest "no data" when tools return empty. Proactive suggestions (below-par, supplier cutoffs). Adaptation loop via thumbs/regeneration → re-tag queue.
**Depends on:** Phase 3 (retrieval service + mock-ops tools required)
**Research:** Unlikely (Anthropic SDK tool use is well-documented)

**Scope:**
- Chat orchestration with Claude tool use
- Conversation persistence, retrievedItemIds + toolCallLog provenance
- Proactive suggestions (onConversationOpen, onTurn context checks)
- Retrieval-quality adaptation loop (thumbs + regeneration → re-tag queue, eval harness)

**Plans:**
- [x] 04-01: Chat with Claude tool use — knowledge retrieval + mock-ops tools, honest no-data responses, conversation persistence (completed 2026-04-18)
- [x] 04-02: Proactive suggestions — conversation-open + mid-turn context checks powered by mock tools (completed 2026-04-18)
- [x] 04-03: Adaptation loop — thumbs/regeneration/low-score → re-tag queue, eval harness with canned query set (completed 2026-04-18)

### Phase 5: Web Interface

**Goal:** Basic Next.js chat UI with suggestion surface and thumbs feedback. Debug panel for retrieval scores and tool call traces.
**Depends on:** Phase 4 (chat API + suggestions + adaptation signals must exist)
**Research:** Unlikely (standard Next.js + shadcn/ui)

**Scope:**
- Chat thread with conversation persistence
- Suggestion surface (system-authored messages pre-input)
- Thumbs feedback wired to adaptation loop
- Debug panel: retrieval scores, re-tag queue status, tool call traces

**Plans:**
- [ ] 05-01: Chat UI — conversation thread, message input, venue selector, suggestion surface, thumbs feedback
- [ ] 05-02: Debug / observability panel — retrieval scores, re-tag queue, tool call traces

---
*Roadmap created: 2026-04-13*
*Last updated: 2026-04-18*
