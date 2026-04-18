# Phase 3 CONTEXT — Agentic Knowledge Layer

**Discussion date:** 2026-04-18
**Supersedes:** 03-01-PLAN_superseded.md, 03-01-AUDIT_superseded.md
**Phase name needs updating:** "Retrieval Layer" → proposed "Agentic Knowledge Layer" (applies during /paul:plan).

---

## Why we're rediscussing

Plan 03-01 was superseded mid-APPLY when the user flagged that `RetrievalKind = 'sop' | 'stock'` — and more deeply, the whole `SopDocument` vs `StockItem` structural split — contradicts the product intent.

User verbatim:
> "Our KB needs to be super flexible. Nothing is strict, it isn't a case of 'This document is 1 of these types we've predefined', the AI needs to be insanely agentic. We'll have access to Xero/Square etc, so we can query stock, pricing, etc. AI should be evolving over time, it's never 'Oh we need to release a new update for it to do X', it learns, adapts, and even suggests."

And on POC bar:
> "For a POC to be a POC, it needs to work. We can't just spoof the POC for potential investors."

This reframes "POC" from "internal prototype" to "investor-ready working demo." Quality bar goes up.

---

## Goals

1. **Shapeless knowledge base.** No predefined document types, no category enum. A single `KnowledgeItem` model with `content: text` + `metadata: Json` + `embedding: vector(1024)`. Claude fills the metadata freely at ingest — tags, inferred doc type, cross-references, summary — whatever is useful. New document kinds arrive without schema changes.

2. **Ops data lives externally — mocked for now.** Stock, suppliers, pricing, purchase orders come from Xero/Square in production. For this milestone, they live in `mock_stock`, `mock_suppliers`, `mock_purchase_orders`, `mock_stock_categories` tables with file-header comments like `// TEMPORARY — replaced by Xero integration in a later milestone`. The mocks expose the same *shape* the real integrations will (typed adapter layer) so swap-in is a one-module replacement, not a rewrite.

3. **Agentic ingest — for real.** When a doc is added, Claude classifies, tags, and cross-references it. No predefined taxonomy. Those classifications feed retrieval. Demonstrable: drop in a brand-new doc type; query it by intent, not keyword; it surfaces correctly.

4. **Proactive suggestions — for real.** AI surfaces things unprompted from mock-ops data. Conversation open: "3 kegs below par — draft orders?" Mid-turn when relevant: "Your Heineken cutoff is in 2 hours." Built as a context-check pass before/during chat turns, powered by the same mock tools as reactive queries.

5. **Honest "I don't have that data."** Retrieval quality signal + Claude prompt discipline. Low-similarity retrievals surface as "I don't have anything specific on that" rather than hallucinated answers. Tool calls that return empty are reported, not improvised around.

6. **Adaptation loop — real but demo-secondary.** Thumbs / regeneration / low-score signals feed a re-tag queue; Claude re-reads failing docs and rewrites metadata. Persisted. Effect compounds over time. Will not be the visual hook for a 30-second pitch — pitch leads with #3 and #4 — but it's the trust story: "the more you use it, the better it gets."

---

## Approach (technical direction)

### Schema reshape

- **New:** `KnowledgeItem { id, venueId?, content, metadata Json, embedding vector(1024), aiSummary, createdAt, updatedAt }`. `metadata` holds Claude-authored tags, inferred doc type, cross-refs, anything emergent. No enum constraints.
- **Rename:** `StockItem` → `mock_stock` (Prisma model: `MockStock`), `Supplier` → `mock_suppliers` (`MockSupplier`), `PurchaseOrder` → `mock_purchase_orders`, `PurchaseOrderItem` → `mock_purchase_order_items`, `StockCategory` → `mock_stock_categories`.
- **Drop:** `SopDocument` (content/tags migrate into `KnowledgeItem.content` + `metadata`).
- **Keep unchanged:** `Venue`, `VenueContact`, `ChatConversation`, `ChatMessage`. Stock/SOP ID arrays on `ChatMessage` become a generic `retrievedItemIds: String[]` + `toolCallLog Json`.

### Ingest pipeline (replaces enrichment)

- Raw doc in → Claude generates `metadata` Json (freeform: `{ docType, tags[], crossRefs[], summary, … }`). No fixed schema for the object; validate only that it *is* JSON object.
- Compose embedding text from `content + metadata` so cross-refs and tags contribute to retrieval signal.
- Store row + embedding in one transaction.

### Retrieval + tools (Claude decides)

- `KnowledgeRetrievalService.find(queryEmbedding, venueId, limit)` → vector cosine over `KnowledgeItem` with metadata filtering available. No hardcoded doc-type arguments.
- Ops functions exposed as **Claude tools**, not direct queries: `getStockBelowPar(venueId)`, `getStockByName(venueId, name)`, `getSupplierByName(…)`, `getUpcomingCutoffs(venueId)`, etc. Each backed by mock tables behind a typed adapter. Chat orchestration lets Claude pick which tools to call based on intent.
- Guardrail: every tool must be able to return `{ found: false, reason: '...' }` so "I don't have that data" propagates up.

### Proactive suggestions

- `SuggestionService.onConversationOpen(venueId)` and `onTurn(conversation, latestMessage)` run context-check queries (mock-stock below par, cutoffs within N hours, overdue POs). Claude composes suggestion text; UI surfaces them as system-authored messages before user input.

### Adaptation loop

- UI captures thumbs + regeneration + low-score-threshold signals per message.
- Background queue (in-process for POC; BullMQ post-POC) reads signals, runs a re-tag pass for the retrieved docs on the failing query, Claude rewrites `metadata`, re-embeds, persists.
- Eval harness (small canned query set) captures retrieval quality weekly so regressions get caught.

---

## Revised phase map (for /paul:plan to confirm or adjust)

| Plan | Purpose |
|------|---------|
| 03-01 | Schema rework: KnowledgeItem + mock_* rename, migration, re-seed fixture |
| 03-02 | Agentic ingest pipeline: Claude → freeform metadata + embedding |
| 03-03 | Knowledge retrieval service + mock-ops tool adapters with not-found guardrail |
| 04-01 | Chat orchestration: Claude with tool use (knowledge retrieval + ops tools), honest no-data responses, conversation persistence |
| 04-02 | Proactive suggestions: conversation-open + mid-turn context checks |
| 04-03 | Adaptation loop: thumbs/regeneration/low-score → re-tag queue, eval harness |
| 05-01 | Web UI: chat thread, suggestion surface, thumbs feedback |
| 05-02 | Debug / observability: retrieval scores, re-tag queue status, tool call traces |

~8 plans vs original 4 remaining. Milestone grows but scope is now coherent with intent.

**Not in scope for this milestone:** real Xero / Square OAuth + API integration (replaces the mock_* adapters in a later milestone); WhatsApp channel; auth / multi-tenancy; production queues.

---

## Open questions for /paul:plan to resolve

1. **`KnowledgeItem.metadata` validation.** Completely unvalidated Json, or soft Zod schema with optional fields (`docType?`, `tags?`, `crossRefs?`) that Claude is *encouraged* to fill but can extend? Leaning toward soft schema with `passthrough()` — retrieval can filter by common fields, but Claude can add emergent keys.

2. **Cross-reference mechanism.** `metadata.crossRefs` as string ids? As freeform strings that re-resolve by name? As a separate `KnowledgeLink` table? Simplest: ids with a consistency sweep job.

3. **Re-seed or data migration?** 6 SOPs + 24 stock rows exist in NeonDB. Cleanest path: drop tables, re-run seed against new schema. The SOP content is fixture data; no prod data yet so migration is not needed.

4. **Suggestion trigger policy.** How proactive is proactive? Every conversation open? Only if below-par count > 0? Rate-limited? Need a concrete rule so Claude doesn't spam.

5. **Adaptation-loop signals weighting.** Is a single thumbs-down enough to trigger a re-tag, or does it need to cross a threshold? Does regeneration alone count? Needs concrete rule.

6. **Eval harness.** Fixed canned-query set for regression tracking. How many queries, what expected outputs, how automated? Minimum viable: ~20 queries with expected-item ids.

7. **Tool return shape.** Standard envelope for every mock tool so Claude handles not-found uniformly: `{ ok: true, data } | { ok: false, reason: 'no-data' | 'not-supported' | 'error' }`. Confirm pattern before plan.

8. **Phase name / ROADMAP changes.** Phase 3 rename ("Agentic Knowledge Layer"), Phase 4 and 5 scope expansion. Needs ROADMAP edit during /paul:plan.

---

## Constraints and anti-goals

- **No type enums on knowledge content.** If you find yourself writing `type: 'sop' | 'menu' | 'recipe'` on `KnowledgeItem`, stop.
- **No hidden spoofing.** Mocks are visibly mocks (table names, code comments). Nothing pretends to call Xero when it's actually a hardcoded response.
- **No hallucination cover.** If retrieval returns nothing relevant and tools return empty, the AI says so. Prompt must enforce this; retrieval quality threshold feeds it.
- **No batch/manual re-tag for demo.** Adaptation has to be real and automatic. A "click here to re-train" button is not real learning.

---

## Ready for /paul:plan

Start with Plan 03-01 (schema rework + mock_* rename + re-seed). Everything downstream depends on the new schema.
