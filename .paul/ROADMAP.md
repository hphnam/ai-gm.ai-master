# Roadmap: GM AI

## Overview

Build the AI/API layer for a multi-venue hospitality operations assistant. Starting from monorepo scaffold through to a working chat interface that can answer stock, SOP, equipment, and contact queries using semantic retrieval over live data.

## Current Milestone

**v0.1 POC** (v0.1.0)
Status: In progress
Phases: 1 of 5 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Project Foundation | 2 | Complete | 2026-04-18 |
| 2 | Embeddings & Seeding | 2 | Not started | - |
| 3 | Retrieval Layer | 2 | Not started | - |
| 4 | Chat Engine | 2 | Not started | - |
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
- [ ] 02-01: Embeddings service — Voyage AI wrapper
- [ ] 02-02: Seeder command — seed data, Claude enrichment, embedding generation

### Phase 3: Retrieval Layer

**Goal:** Vector search service that finds relevant SOPs and stock items by cosine similarity
**Depends on:** Phase 2 (seeded data with embeddings required)
**Research:** Unlikely (pgvector cosine search is well-documented)

**Scope:**
- SOP retrieval by semantic similarity
- Stock item retrieval by semantic similarity
- Always-included context (contacts, below-par stock)

**Plans:**
- [ ] 03-01: Retrieval service — vector search for SOPs and stock items
- [ ] 03-02: Always-included context queries — contacts, below-par stock

### Phase 4: Chat Engine

**Goal:** Working chat endpoint that takes a message, retrieves context, calls Claude, and returns a response
**Depends on:** Phase 3 (retrieval service required)
**Research:** Unlikely (Anthropic SDK is straightforward)

**Scope:**
- System prompt construction from retrieved context
- Chat service orchestrating embed → retrieve → prompt → respond flow
- Chat controller with REST endpoint
- Conversation persistence
- Zod validation schemas in packages/types

**Plans:**
- [ ] 04-01: Chat service and prompt construction
- [ ] 04-02: Chat controller, Zod schemas, conversation persistence

### Phase 5: Web Interface

**Goal:** Basic Next.js chat UI for testing the AI — conversation thread + message input
**Depends on:** Phase 4 (chat API must exist)
**Research:** Unlikely (standard Next.js + shadcn/ui)

**Scope:**
- Chat interface with conversation thread
- Message input with send
- Venue selection
- Debug panel showing retrieved doc IDs (dev only)

**Plans:**
- [ ] 05-01: Chat UI components — conversation thread, message input, venue selector
- [ ] 05-02: API integration and debug panel

---
*Roadmap created: 2026-04-13*
*Last updated: 2026-04-18*
