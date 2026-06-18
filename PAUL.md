# PAUL — GM AI: General Manager AI Platform

You are PAUL, an expert TypeScript/NestJS engineer. This document is your complete brief for building the GM AI platform. Read it fully before writing a single line of code.

---

## 1. Project Overview

**GM AI** is a multi-venue operations assistant for hospitality businesses (pubs, bars, restaurants). Staff and managers interact with it via a chat interface (WhatsApp is the long-term target channel; we are building the AI/API layer first).

The AI acts as a knowledgeable general manager that can:

- Answer **stock and ordering questions** — "Do we need to order more lager?", "What's our wine situation?"
- Answer **procedural questions** from SOPs — "How do I change a keg?", "What's the closing procedure?"
- Answer **equipment troubleshooting questions** — "The ice machine isn't making ice", "What does error E2 mean?"
- Answer **contact/supplier questions** — "Who do I call for a fridge repair?", "What's the order cutoff for Brakes?"

The AI must reason over **live data from the database** (stock levels, par levels, usage rates, recent purchase orders) and **retrieve relevant SOP documents via semantic search** — not keyword matching.

---

## 2. Tech Stack

Use Ryan's standard stack exactly as specified. Do not deviate.

| Layer | Technology |
|---|---|
| Monorepo | Turborepo |
| API | NestJS (latest) |
| ORM | Prisma |
| Database | NeonDB (Postgres + pgvector) |
| Queue | BullMQ + Redis |
| Auth | better-auth with organisation plugin |
| AI — Chat | Anthropic SDK (`@anthropic-ai/sdk`) — Claude claude-sonnet-4-20250514 |
| AI — Embeddings | Voyage AI (`voyageai`) — model `voyage-3` |
| Validation | Zod exclusively — shared from `packages/types` |
| Frontend | Next.js (App Router) with shadcn/ui |
| Deployment | Coolify on Hetzner |

**Critical rules:**
- Never hardcode package version numbers in `package.json` — use `latest` or let the install resolve
- Use `@nestjs/bullmq` — never the legacy `@nestjs/bull`
- All Zod schemas live in `packages/types` and are imported by both API and web
- Prisma client is generated from `packages/database`

---

## 3. Monorepo Structure

```
gm-ai/
├── apps/
│   ├── api/          # NestJS
│   └── web/          # Next.js
├── packages/
│   ├── database/     # Prisma schema + generated client
│   ├── types/        # Zod schemas shared across apps
│   └── config/       # Shared config (eslint, tsconfig)
├── turbo.json
└── package.json
```

---

## 4. Database Schema

Define the full schema in `packages/database/prisma/schema.prisma`.

### 4.1 pgvector Setup

The NeonDB connection string will already have pgvector available. Enable it via a migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Use Prisma's `Unsupported("vector(1024)")` type for embedding columns. Voyage AI `voyage-3` produces 1024-dimension vectors.

### 4.2 Full Schema

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

model Venue {
  id        String   @id @default(uuid())
  name      String
  address   String?
  type      String   // 'bar' | 'restaurant' | 'pub' | 'cafe'
  timezone  String   @default("Europe/London")
  createdAt DateTime @default(now())

  stockItems     StockItem[]
  sopDocuments   SopDocument[]
  purchaseOrders PurchaseOrder[]
  contacts       VenueContact[]
}

model Supplier {
  id            String   @id @default(uuid())
  name          String
  contactName   String?
  email         String?
  phone         String?
  leadTimeDays  Int      @default(2)
  notes         String?
  createdAt     DateTime @default(now())

  stockItems     StockItem[]
  purchaseOrders PurchaseOrder[]
}

model StockCategory {
  id   String @id @default(uuid())
  name String @unique // 'draught' | 'spirits' | 'wine' | 'soft_drinks' | 'food' | 'cleaning' | 'disposables'

  stockItems StockItem[]
}

model StockItem {
  id             String   @id @default(uuid())
  venueId        String
  supplierId     String?
  categoryId     String
  name           String
  sku            String?
  unit           String   // 'keg' | 'bottle' | 'case' | 'kg' | 'litre' | 'unit'
  unitSize       String?  // e.g. '11gal', '70cl', '24x330ml'
  currentQty     Decimal
  parLevel       Decimal
  reorderQty     Decimal
  costPerUnit    Decimal?
  avgWeeklyUsage Decimal?
  notes          String?

  // AI-generated fields — populated by seeder, not manually
  embedding      Unsupported("vector(1024)")?
  embeddingText  String?  // The text that was embedded (for debugging/re-embedding)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  venue              Venue              @relation(fields: [venueId], references: [id], onDelete: Cascade)
  supplier           Supplier?          @relation(fields: [supplierId], references: [id])
  category           StockCategory      @relation(fields: [categoryId], references: [id])
  purchaseOrderItems PurchaseOrderItem[]

  @@index([venueId])
  @@index([categoryId])
}

model PurchaseOrder {
  id          String    @id @default(uuid())
  venueId     String
  supplierId  String
  status      String    @default("draft") // 'draft' | 'sent' | 'received' | 'cancelled'
  orderedAt   DateTime?
  expectedAt  DateTime?
  receivedAt  DateTime?
  notes       String?
  createdAt   DateTime  @default(now())

  venue    Venue              @relation(fields: [venueId], references: [id], onDelete: Cascade)
  supplier Supplier           @relation(fields: [supplierId], references: [id])
  items    PurchaseOrderItem[]
}

model PurchaseOrderItem {
  id           String   @id @default(uuid())
  poId         String
  stockItemId  String
  qtyOrdered   Decimal
  qtyReceived  Decimal?
  unitCost     Decimal?

  purchaseOrder PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)
  stockItem     StockItem     @relation(fields: [stockItemId], references: [id])
}

model SopDocument {
  id        String   @id @default(uuid())
  venueId   String?  // null = global (applies to all venues)
  title     String
  category  String   // 'opening' | 'closing' | 'equipment' | 'emergency' | 'hr' | 'health_safety' | 'operations'
  content   String
  version   Int      @default(1)
  updatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // AI-generated fields — populated by seeder/on save
  embedding   Unsupported("vector(1024)")?
  aiSummary   String?   // 1-2 sentence digest for context injection
  aiTags      String[]  // AI-generated semantic tags

  venue Venue? @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId])
  @@index([category])
}

model VenueContact {
  id                  String  @id @default(uuid())
  venueId             String
  name                String
  role                String
  phone               String?
  email               String?
  isEmergencyContact  Boolean @default(false)
  notes               String?

  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)
}

model ChatConversation {
  id        String   @id @default(uuid())
  venueId   String
  userId    String?  // optional — will tie to auth later
  channel   String   @default("web") // 'web' | 'whatsapp'
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages ChatMessage[]
}

model ChatMessage {
  id             String   @id @default(uuid())
  conversationId String
  role           String   // 'user' | 'assistant'
  content        String
  // Store which context docs were retrieved for this response (for debugging/evals)
  retrievedSopIds    String[]
  retrievedStockIds  String[]
  createdAt      DateTime @default(now())

  conversation ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

---

## 5. NestJS Module Structure

```
apps/api/src/
├── app.module.ts
├── main.ts
├── modules/
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── chat.prompts.ts      # System prompt construction
│   ├── embeddings/
│   │   ├── embeddings.module.ts
│   │   └── embeddings.service.ts  # Voyage AI wrapper
│   ├── retrieval/
│   │   ├── retrieval.module.ts
│   │   └── retrieval.service.ts   # Vector search against DB
│   ├── stock/
│   │   ├── stock.module.ts
│   │   └── stock.service.ts       # Stock queries for AI context
│   └── seed/
│       ├── seed.module.ts
│       └── seed.command.ts        # NestJS Commander seeder
```

---

## 6. Embeddings Service

`apps/api/src/modules/embeddings/embeddings.service.ts`

This is a thin wrapper around Voyage AI. All other services call this — never call the Voyage SDK directly elsewhere.

```typescript
import { Injectable, Logger } from '@nestjs/common'
import VoyageAI from 'voyageai'

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name)
  private readonly client: VoyageAI

  constructor() {
    this.client = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY })
  }

  async embedText(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: 'voyage-3',
      input: text,
      inputType: 'query', // use 'document' when embedding content to store
    })
    return response.data[0].embedding
  }

  async embedDocument(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: 'voyage-3',
      input: text,
      inputType: 'document',
    })
    return response.data[0].embedding
  }

  // Batch embed — use when seeding
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const response = await this.client.embed({
      model: 'voyage-3',
      input: texts,
      inputType: 'document',
    })
    return response.data.map((d) => d.embedding)
  }
}
```

---

## 7. Seeder Command

The seeder is a NestJS Commander command (`nest-commander`). Run it with:

```bash
npm run seed
```

### 7.1 What the seeder does

For each SOP document:
1. Insert raw data via Prisma
2. Call Claude to generate an `aiSummary` (1-2 sentences) and `aiTags` (array of semantic tags)
3. Build the embedding text: `"${title}. ${aiSummary}. Tags: ${aiTags.join(', ')}. ${content}"`
4. Call Voyage AI to embed it
5. Store the vector via raw Prisma `$executeRaw` (pgvector requires raw SQL for inserts)

For each stock item:
1. Insert raw data via Prisma
2. Build the embedding text: `"${name}. Category: ${category}. Unit: ${unitSize}. ${notes ?? ''}"`
3. Embed and store

### 7.2 Embedding storage pattern

Prisma does not support pgvector writes via the standard client. Use `$executeRaw`:

```typescript
await prisma.$executeRaw`
  UPDATE sop_documents
  SET embedding = ${`[${vector.join(',')}]`}::vector
  WHERE id = ${id}
`
```

### 7.3 Claude enrichment prompt for SOP documents

```typescript
const enrichmentPrompt = `
You are enriching an SOP document for a hospitality operations AI system.

Given the following SOP document, return a JSON object with:
- "summary": A 1-2 sentence plain-English summary of what this document covers
- "tags": An array of 5-10 lowercase semantic tags (e.g. ["ice_machine", "equipment", "error_codes", "troubleshooting"])

Respond ONLY with valid JSON. No markdown, no explanation.

Title: ${doc.title}
Category: ${doc.category}
Content:
${doc.content}
`
```

Parse the response strictly. If Claude returns invalid JSON, log and skip — do not crash the seeder.

### 7.4 Seeder data

The seeder hardcodes the seed data as TypeScript objects (not a SQL file). The data mirrors the content defined in the `seed.sql` reference file:

- 2 venues: "The Crown" (Preston), "The Anchor Bar" (Liverpool)
- 5 suppliers: Matthew Clark, Carlsberg UK, Brakes Bros, Diageo GB, Coca-Cola EP
- ~25 stock items across all categories for The Crown
- 6 SOP documents: Ice Machine Troubleshooting, Cellar Management, Opening Procedure, Closing Procedure, Fire Emergency, Weekly Ordering Guide
- Venue contacts for The Crown

Seed in dependency order: venues → suppliers → categories → stock items → SOPs → contacts.

---

## 8. Retrieval Service

`apps/api/src/modules/retrieval/retrieval.service.ts`

This service handles all vector searches. It is called by `ChatService` before constructing the prompt.

### 8.1 SOP retrieval

```typescript
async findRelevantSops(
  queryEmbedding: number[],
  venueId: string,
  limit = 3,
): Promise<SopDocument[]> {
  // Returns SOPs for the venue OR global SOPs (venueId IS NULL)
  // Ordered by cosine similarity to query embedding
  const results = await this.prisma.$queryRaw<SopDocument[]>`
    SELECT id, title, category, content, ai_summary, ai_tags,
           1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) AS similarity
    FROM sop_documents
    WHERE (venue_id = ${venueId} OR venue_id IS NULL)
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
    LIMIT ${limit}
  `
  return results
}
```

### 8.2 Stock retrieval

```typescript
async findRelevantStockItems(
  queryEmbedding: number[],
  venueId: string,
  limit = 10,
): Promise<StockItem[]> {
  const results = await this.prisma.$queryRaw<StockItem[]>`
    SELECT si.*, sc.name AS category_name, s.name AS supplier_name,
           s.lead_time_days,
           ROUND((si.current_qty / NULLIF(si.avg_weekly_usage, 0))::numeric, 1) AS weeks_remaining,
           CASE
             WHEN si.current_qty = 0 THEN 'OUT_OF_STOCK'
             WHEN si.current_qty < si.par_level THEN 'BELOW_PAR'
             WHEN si.current_qty >= si.par_level * 1.5 THEN 'OVERSTOCKED'
             ELSE 'OK'
           END AS stock_status,
           1 - (si.embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) AS similarity
    FROM stock_items si
    JOIN stock_categories sc ON sc.id = si.category_id
    LEFT JOIN suppliers s ON s.id = si.supplier_id
    WHERE si.venue_id = ${venueId}
      AND si.embedding IS NOT NULL
    ORDER BY si.embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
    LIMIT ${limit}
  `
  return results
}
```

### 8.3 Always-included context

Regardless of the query, always fetch and include in the prompt:
- All venue contacts for the venue (small, always relevant)
- Any stock items currently `OUT_OF_STOCK` or `BELOW_PAR` (proactive awareness)

---

## 9. Chat Service

`apps/api/src/modules/chat/chat.service.ts`

This is the core of the AI layer.

### 9.1 Flow

```
sendMessage(venueId, message, conversationHistory)
  1. Embed the user's message (EmbeddingsService.embedText)
  2. Retrieve relevant SOPs (RetrievalService.findRelevantSops)
  3. Retrieve relevant stock items (RetrievalService.findRelevantStockItems)
  4. Fetch always-included context (contacts, items below par)
  5. Build system prompt (ChatPrompts.buildSystemPrompt)
  6. Call Claude with full conversation history
  7. Persist ChatConversation + ChatMessage records (user + assistant)
  8. Return assistant message + metadata (retrieved doc IDs for tracing)
```

### 9.2 Claude call

```typescript
const response = await this.anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: systemPrompt,
  messages: conversationHistory, // { role: 'user' | 'assistant', content: string }[]
})
```

Pass the full conversation history so the AI maintains context across turns.

### 9.3 System prompt structure

Build in `chat.prompts.ts`. The system prompt has these sections, assembled dynamically:

```
## Role
You are the General Manager AI for [venue name]. You are a knowledgeable, 
concise operations assistant for hospitality staff. You answer questions about 
stock, ordering, procedures, equipment, and venue operations.

You have access to live stock data and operational documents. Always reason 
from the data provided. If information is not in your context, say so clearly 
— do not guess.

Tone: Direct, practical, professional. Like a good GM — not a chatbot.

## Venue
Name: [name]
Type: [type]
Address: [address]

## Key Contacts
[formatted list of venue contacts]

## Current Stock Status (items requiring attention)
[list of OUT_OF_STOCK and BELOW_PAR items with current qty, par level, 
weeks of stock remaining, and supplier]

## Relevant Stock Items
[top-N semantically matched stock items with full detail]

## Relevant Operational Documents
[top-3 semantically matched SOP documents — title, summary, and full content]

## Today's Date
[ISO date string — for reasoning about lead times, delivery days etc.]
```

Keep the prompt factual and data-dense. Do not pad it with instructions about tone beyond what is necessary.

---

## 10. Chat Controller

`apps/api/src/modules/chat/chat.controller.ts`

```typescript
POST /chat/message
Body: {
  venueId: string      // UUID
  message: string      // user's message
  conversationId?: string  // if continuing an existing conversation
}

Response: {
  conversationId: string
  message: string          // assistant's response
  debug?: {                // only in development
    retrievedSopIds: string[]
    retrievedStockIds: string[]
  }
}
```

Validate with Zod. Schema lives in `packages/types/src/chat.ts`.

---

## 11. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Voyage AI
VOYAGE_API_KEY=pa-...

# Redis (BullMQ)
REDIS_URL=redis://...

# App
NODE_ENV=development
PORT=3001
```

---

## 12. Implementation Order

Work in this exact order:

1. **Monorepo scaffold** — Turborepo, apps/api, apps/web, packages/database, packages/types
2. **Prisma schema** — implement Section 4 exactly, run initial migration
3. **EmbeddingsService** — implement and verify Voyage AI connection returns vectors
4. **Seeder command** — implement Section 7, run against local Neon branch, verify embeddings are stored
5. **RetrievalService** — implement Section 8, write a quick manual test to verify cosine search returns sensible results
6. **ChatService + prompts** — implement Section 9
7. **ChatController** — implement Section 10
8. **Basic web UI** — Next.js chat interface using shadcn/ui. Simple: conversation thread + message input. No auth yet.

Do not build auth, multi-tenancy, or BullMQ queues in the POC. Those come after the AI behaviour is proven.

---

## 13. Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| Voyage AI for embeddings | Anthropic-recommended, `voyage-3` is strong for domain-specific retrieval |
| Semantic retrieval over keyword | "How do I fix the ice machine" has no exact keyword match in SOP titles |
| SOPs embedded as summary+tags+content | Pure content embedding loses title signal; hybrid text captures intent better |
| Always include below-par stock | GM should proactively know what needs ordering without being asked |
| Persist retrieved IDs per message | Enables future evals — did the AI retrieve the right docs for each query? |
| No intent classification step | Let the embedding similarity handle retrieval routing — simpler, more robust at POC stage |
| Conversation history passed on every call | Claude has no memory between calls — full history required for multi-turn context |

---

## 14. Test Queries to Validate Behaviour

Once running, these queries should all return accurate, well-reasoned responses:

**Stock queries**
- "Do we need to order more lager?"
- "What's our wine situation?"
- "What are we out of?"
- "When does our Hendricks order arrive?"

**Procedural queries**
- "How do I close down tonight?"
- "Walk me through the opening procedure"
- "What do I do at last orders?"

**Equipment queries**
- "The ice machine isn't making ice"
- "The ice machine is showing error E2"
- "How often do we clean the lines?"

**Contact/supplier queries**
- "Who do I call if the cellar cooler breaks?"
- "What's the cutoff time for ordering from Brakes?"
- "Who is the area manager?"

**Multi-turn**
- "Do we need to order more lager?" → "Who do we order it from?" → "What's their number?"

---

*PAUL — read this document fully, ask no clarifying questions, and begin with step 1 of Section 12.*
