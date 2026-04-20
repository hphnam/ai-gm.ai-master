# GM AI

## What This Is

A multi-venue operations assistant for hospitality businesses (pubs, bars, restaurants). Staff and managers interact via a chat interface to ask about stock levels, ordering, SOPs, equipment troubleshooting, and supplier contacts. The AI reasons over live database data and retrieves relevant documents via semantic search — not keyword matching. WhatsApp is the long-term target channel; the AI/API layer is being built first.

## Core Value

Hospitality staff and managers can get instant, accurate answers about stock, ordering, procedures, equipment, and contacts — like having a knowledgeable GM available 24/7 via chat.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.2.0 |
| Status | v0.2 Multi-Tenant WhatsApp — Phase 3 complete (3/3 plans); Phase 4 (Coolify Deployment) next; ~75% milestone complete (10/~13 plans) |
| Last Updated | 2026-04-20 |

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
- Agentic knowledge schema — `KnowledgeItem { content, metadata Json, embedding vector(1024) }` replaces `SopDocument`/`StockItem` enum split; `mock_*` ops tables rename with visible TEMPORARY markers; migration via `prisma migrate diff → deploy` (approval-gated); seeder rewritten to pure upsert. (Phase 3, Plan 03-01 — 2026-04-18)
- Agentic ingest pipeline — `IngestService` authored freeform metadata (summary, tags, docType, crossRefs + emergent keys like errorCodes/timeOfDay/contactNames) via Claude; Zod `.passthrough()` contract in `@gm-ai/types` preserves emergent keys; transactional upsert + vector UPDATE; seeded docs average ~9 emergent keys each, 5/6 with populated crossRefs. (Phase 3, Plan 03-02 — 2026-04-18)
- Knowledge retrieval + mock-ops tool adapters — `KnowledgeRetrievalService.find()` with honest no-data (0.3 threshold, gibberish → `ok: false`), `MockOpsService` with 4 tool adapters (getStockBelowPar, getStockByName, getSupplierByName, getUpcomingCutoffs), universal `ToolResult<T>` discriminated union in `@gm-ai/types`; every service method never throws (shared `guarded()` exception wrapper); PII-safe `retrieval.call` audit log. (Phase 3, Plan 03-03 — 2026-04-18)
- Chat engine with Claude tool use — `ChatService.sendMessage()` runs a max-6-round tool-use loop over `find_knowledge` + `get_stock_below_par` + `get_stock_by_name` + `get_supplier_by_name` + `get_upcoming_cutoffs`; venue-context injected in system prompt; full conversation + tool provenance persisted (chat_messages with `toolCallLog` + `retrievedItemIds`); per-round `chat.claude_call` observability logs; Zod `SendMessageInputSchema` trust boundary; cross-tenant conversationId preflight. (Phase 4, Plan 04-01 — 2026-04-18)
- Proactive suggestions — `SuggestionsService` with `onConversationOpen(venueId)` + `onTurn(venueId, msg, conversationId?)` returning `ProactiveSuggestion[]` (`kind: 'below-par' | 'cutoff'`, `severity: 'info' | 'warn'`, ToolName-typed `sourceToolCall`); deterministic composition via `composeSuggestions` pure helper; `runDispatchWithTimeout` 3000ms wrapper on every ToolDispatcher call; cross-tenant conversationId preflight; PII-safe logging (userMessage never logged). (Phase 4, Plan 04-02 — 2026-04-18)
- Retrieval-quality adaptation loop — `MessageFeedback` + `ReTagQueueItem` schema; `AdaptationService` with `captureFeedback` (thumbs-up/down/regenerate + kind-transition + MAX_ENQUEUE_PER_FEEDBACK=10 cap) / `enqueueReTag` (active-status dedupe + MAX_RETAG_ATTEMPTS=3 failed-item lockout) / `captureRetrievalOutcome` (LOW_SIM_THRESHOLD=0.45, inline-awaited from ChatService with defensive type guards) / `processReTagQueue` (atomic claim + DRAIN_SOFT_DEADLINE_MS=60000 + drain_summary log); probe-eval canned query harness (6 queries, retrieval_hit pass rate exit gate at 60%). (Phase 4, Plan 04-03 — 2026-04-18)
- REST API surface over Phase 4 services — ChatController / SuggestionsController / FeedbackController / VenuesController behind `zodPipe(Schema)` factory; canonical `ApiErrorResponse = {error: ApiErrorCode; details?}` with closed `API_ERROR_CODES` in `@gm-ai/types/api.ts`; CORS origin allowlist via `WEB_ORIGIN`; 32kb body-parser cap; X-Request-Id middleware + PII-safe `http.request` JSON logger; Anthropic `sendWithRetry()` on 429/5xx; cross-tenant `?venueId` 404-not-403 pattern; `translate-chat-error.ts` single-source error helper; probe-api.ts 22 assertions with `channel='probe-api'` FK-safe cleanup. (Phase 5, Plan 05-01 — 2026-04-18)
- Next.js chat UI — Tailwind v4 + shadcn/ui (new-york) foundation; apiFetch singleton with UUID v4 X-Request-Id per call + ApiError.requestId capture; URL-as-state (?venue=, ?conv=); React Query for all server state; react-hook-form + zodResolver; venue selector + multi-turn thread with optimistic render + proactive suggestions + thumbs feedback; XSS-safe plain-text rendering (whitespace-pre-wrap, zero dangerouslySetInnerHTML, zero markdown libs); WCAG AA baseline (role="log"+aria-live="polite", aria-label/aria-pressed on icon-only buttons, icon+text severity never color-only); App Router error.tsx + loading.tsx per segment; `mapApiError()` single-source client-side code-to-string translation. (Phase 5, Plan 05-02 — 2026-04-18)
- Debug / observability panel — read-only `/debug/*` surface (3 endpoints) on apps/api exposing Phase 4 provenance; `/debug?venue=&conv=` route on apps/web rendering conversation trace (per-message cards with collapsible toolCallLog + similarity color bands with text labels + feedback badges) + re-tag queue panel (counts across 5 known statuses + items with status/attempts/lastError/sourceMessageId click-to-scroll); tenant-strict OR clause on retag queue (probe D5 guards cross-tenant leak); dual content caps (server 2048-char toolCallLog content + client 64KB JSON viewer with omitted-byte banner); dual-layer noindex defence (Next.js `robots:{index:false,follow:false}` metadata + `X-Robots-Tag: noindex, nofollow` response header via next.config.ts headers()) + amber operator warning banner; 90-day retention gate via typed `RETENTION_90D_MS` constant; `debug.access` per-call structured log via shared `logAccess()` helper; `DebugRequestIdBadge` + `apiFetchWithMeta<T>()` surfacing X-Request-Id on success; probe-api raised 29 → 36 assertions (D1–D7). (Phase 5, Plan 05-03 — 2026-04-19)

#### v0.2 Multi-Tenant WhatsApp
- Auth + Organizations — better-auth with Prisma 7 adapter; Organization + OrganizationMember + User.phoneNumber schema; sign-up + sign-in + invitation flows (email-only); NestJS AuthGuard + RoleGuard wrapping every existing controller; tenant scoping via type-split `withOrgScope` (org-direct) + `withOrgScopeVia` (join-scoped); URL-pin open-redirect guard via `apps/web/src/lib/safe-redirect.ts`; atomic sign-up + org creation via better-auth `databaseHooks.user.create.after`; security-headers middleware (nosniff + frameguard); HTTP logger redaction contract (`/api/auth/*` body + Cookie/Authorization VALUES stripped); `assertAuthEnv` boot-time env validation banning `process.env.X!` non-null assertions; phone-linking via Twilio Verify SMS OTP with live/console/disabled driver modes (kill-switch via getter, no redeploy); maskPhone UI helper (controller responses unmasked); probe-api 36→61 + new probe-auth ≥54 (P1-P31). (Phase 1, Plans 01-01 / 01-02 / 01-03 — 2026-04-20)
- Manager document upload UI + delete — POST/GET/DELETE /docs/* with multipart upload (multer), MIME validation (text/markdown/PDF via unpdf, DOCX via mammoth), `@RequireRole` manager-only, `sanitizeUploadTitle`, MulterExceptionFilter → 413, 30s extraction timeout via Promise.race, docs.uploaded + docs.cross_org_denied audit logs (SOC-2 CC6.6 symmetric on read+write+delete); KnowledgeItem cross-org leak on `venueId=NULL` rows closed via direct organizationId FK + retrieval+ingest+suggestions+tool-input scoping; Next.js /docs page with shadcn Dialog confirmation + dual-mode (text + binary) file handling; probe-api 52 → 61 (A30–A44 incl. real PDF/DOCX binary fixtures + cascade verification). (Phase 2, Plans 02-01 / 02-02 — 2026-04-20)
- WhatsApp inbound webhook + multimodal — Twilio HMAC-SHA1 signature guard with URL-pinned `WHATSAPP_WEBHOOK_PUBLIC_URL` env (closes X-Forwarded-Host spoof); MessageSid replay dedupe + 12s ChatService Promise.race timeout + ack-reply on timeout; verified-sender 30/h cost ceiling; live/console/disabled adapter modes; immediate Twilio v2 typing indicator (`messaging.twilio.com/v2/Indicators/Typing.json` with messageId + channel=whatsapp) wrapped in try/finally cleanup with 20s refire (max 6) + retained-on-exhaustion entry for accurate refireCount; proactive-suggestions opener on new 24h channel='whatsapp' session with cross-tenant orgId scoping; multimodal image inbound via Twilio media download with 4-layer hardening (SSRF host allowlist + redirect re-validation, MIME allowlist enforced in download layer, magic-byte signature validation, streaming byte counter with 5MB cap); ChatService.SendMessageInput.attachment optional with sourceRef forensic correlation in `[image: mediaType, byteSize, sid:...]` placeholder (consistent across stub + real branches); probe-whatsapp 0 → 27 assertions (W0-W26 incl. SSRF 169.254.169.254 + magic-byte 100-zeros + image/svg+xml unsupported-mime); test-mode infrastructure (PROBE_CHAT_SERVICE_DELAY_MS / PROBE_CHAT_SERVICE_STUB / PROBE_TYPING_REFIRE_MS / PROBE_MEDIA_HOST_ALLOWLIST — all NODE_ENV-gated). (Phase 3, Plans 03-01 / 03-02 / 03-03 — 2026-04-20)

### Out of Scope
- Real Xero / Square OAuth + API integration — mocked as `mock_*` tables for this milestone, swapped to real integrations in a later milestone
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
| Agentic KB + mock_* ops tables | Type enums contradict emergent classification; ops data lives externally and will be swapped to Xero/Square — mock tables make the non-integrated state visible. Decided 2026-04-18 after /paul:discuss 03. | 2026-04-18 | Active |
| `.passthrough()` Zod schema for metadata | Closed schema defeats agentic emergence; known fields documented + emergent keys preserved; seeded docs demonstrably emit 8-11 emergent keys | 2026-04-18 | Active |
| `ToolResult<T>` discriminated union as universal service return contract | Consumers exhaustive-switch on ok/reason; three reasons (no-data/not-supported/error) cover the POC surface; fail-soft everywhere; no exceptions propagate | 2026-04-18 | Active |
| Honest retrieval no-data at 0.3 similarity threshold | On 6-doc corpus: real hits 0.45-0.55, gibberish 0.15-0.20; 0.3 cleanly separates signal from noise; better than hallucinating the closest-but-irrelevant match | 2026-04-18 | Active |
| PII-safe retrieval audit log (queryHash + queryLength) | Raw user query content should not enter persistent logs; sha256-prefix + length enable forensic correlation without PII; SOC-2-defensible | 2026-04-18 | Active |
| Venue context injected in system prompt per call | Avoids asking Claude to ask for venueId — single-tenant request, single-call injection | 2026-04-18 | Active |
| ChatModule exports ToolDispatcher alongside ChatService | SuggestionsService needs tool dispatch without re-instantiating; composition via shared DI | 2026-04-18 | Active |
| runDispatchWithTimeout as the ONLY path to ToolDispatcher.dispatch in non-Claude consumers | Uniform timeout + error-log behaviour; grep-verifiable single call site per consumer | 2026-04-18 | Active |
| SuggestionsService non-persistent (derived on each call) | Keeps chat_messages purely dialog; suggestions re-derivable from DB state + call time | 2026-04-18 | Active |
| AdaptationService post-persist wiring in ChatService (inline-awaited, try/catch-shielded inside) | Deterministic signal capture without caller exposure to adaptation-side errors | 2026-04-18 | Active |
| Adaptation cost ceilings exported from @gm-ai/types | MAX_RETAG_ATTEMPTS / MAX_ENQUEUE_PER_FEEDBACK / DRAIN_SOFT_DEADLINE_MS / MAX_DRAIN_LIMIT — one-place-tunable, type-visible to consumers | 2026-04-18 | Active |
| Atomic queue-drain claim via updateMany WHERE status='queued' + count===1 gate | Single-process POC concurrency guard without advisory locks; Prisma 7 compatible | 2026-04-18 | Active |
| Canonical `ApiErrorResponse` with closed `API_ERROR_CODES` in `@gm-ai/types/api.ts` | Prevents per-endpoint error handling drift; UI consumes one closed union; `translate-chat-error.ts` helper consolidates regex substring mapping | 2026-04-18 | Active |
| X-Request-Id middleware + PII-safe `http.request` JSON logger | Per-request correlation handle without logging body/query/param VALUES; echoed in response header; captured in ApiError for UI toasts | 2026-04-18 | Active |
| `zodPipe(Schema)` factory replacing inline `new ZodValidationPipe(...)` | Single-line controller validation; shared @Body/@Query/@Param pattern | 2026-04-18 | Active |
| Cross-tenant GETs return 404-not-403 on venueId mismatch | Avoids enumeration leak (403 confirms existence); probe A8b/A8c/A8d + D2/D5 guard | 2026-04-18 | Active |
| URL-as-state (?venue=, ?conv=) for conversation persistence | POC has no auth; URL is the only persistence surface a refresh / bookmark / tab share can rely on without localStorage privacy edge cases | 2026-04-18 | Active |
| apiFetch singleton as single trust boundary for all apps/web network I/O | Generates UUID v4 X-Request-Id per call; captures server-echoed id on ApiError; AbortSignal passthrough; grep-verified zero other fetch() sites | 2026-04-18 | Active |
| Assistant content rendered as plain text with `whitespace-pre-wrap`, NEVER dangerouslySetInnerHTML | Claude outputs are untrusted enough to ship prompt-injection XSS; sanitized markdown renderer blocked behind explicit threat-model plan | 2026-04-18 | Active |
| WCAG AA baseline shipped pre-emptively (role="log"+aria-live="polite", aria-label/aria-pressed, icon+text severity) | Blockers landed before any accessibility audit could flag them; severity NEVER color-only | 2026-04-18 | Active |
| `mapApiError` hoisted to `apps/web/src/lib/map-api-error.ts` as single-source client-side code-to-string translator | Used by `useFeedback` hook + chat page; mirrors server-side `translateChatServiceError`; any future client-side server-error → user-string mapping goes in `map-*-error.ts`, not duplicated at call sites | 2026-04-18 | Active |
| Read-only `/debug/*` surface: zero writes, zero live AI calls, Prisma joins over persisted state | Debug exists to expose Phase 3/4 provenance without re-running retrieval (would burn Voyage credit + introduce time-skew); write actions (retry queue item, clear failed, force drain) explicitly out of scope | 2026-04-19 | Active |
| Tenant-strict OR clause on retag queue: `(sourceMessage.conversation.venueId) OR (sourceMessageId null AND knowledgeItem.venueId)` | The permissive `{ knowledgeItem: { OR: [{ venueId }, { venueId: null }] } }` form leaks cross-tenant state drift on shared globals (SOC-2 CC6.6 failure); probe D5 regression-guards | 2026-04-19 | Active |
| Dual content caps: server 2048-char `toolCallLog.result.data[].content` + client 64KB JSON viewer with omitted-byte banner | Prevents 100KB toolCallLog entries from freezing main thread on low-end devices; server cap uses `__truncated: true` sibling marker; full payload reachable only via direct DB access | 2026-04-19 | Active |
| Dual-layer noindex defence: Next.js `robots:{index:false,follow:false}` metadata + `X-Robots-Tag: noindex, nofollow` response header | Defence-in-depth for pre-auth /debug URL; amber operator warning banner discourages accidental screenshots; NOT a replacement for auth — documented as defence-in-depth in boundaries | 2026-04-19 | Active |
| `RETENTION_90D_MS` typed constant in `@gm-ai/types` gating all debug findFirst + list queries | Bounds GDPR subject-access scope; one-place-tunable; applied via `retentionCutoff()` helper in service layer | 2026-04-19 | Active |
| `debug.access` per-call structured log via shared `logAccess()` helper | Separates operator-debug from user traffic in grep without branching shared `http-logger.middleware.ts`; DRY factoring over 3 endpoints | 2026-04-19 | Active |
| `apiFetchWithMeta<T>()` as sibling variant to `apiFetch<T>()` surfacing X-Request-Id on SUCCESS | Operator needs requestId handle on success path, not just failure; apiFetch signature frozen — chat hooks unchanged; future observability surfaces import apiFetchWithMeta | 2026-04-19 | Active |
| Twilio v2 typing endpoint: `messaging.twilio.com/v2/Indicators/Typing.json` with messageId+channel | Verified at APPLY-time via WebFetch; older `api.twilio.com/Messages.json` form does NOT exist for typing. Adapter signature is `sendTypingIndicator(inboundMessageSid)` — typing keys off Twilio MessageSid not phone | 2026-04-20 | Active |
| Webhook trust boundary: HMAC-validated payloads cannot be trusted to dictate destination of subsequent fetches | SSRF host allowlist with redirect-target re-validation enforced BEFORE every external fetch from a webhook payload; production env (TWILIO_MEDIA_HOST_ALLOWLIST) + probe-only NODE_ENV-gated bypass (PROBE_MEDIA_HOST_ALLOWLIST) | 2026-04-20 | Active |
| Magic-byte signature validation for any declared binary MIME from external sources | Content-Type is server-asserted, not verifiable. Any binary forwarded to a paid third-party API (Anthropic vision) MUST pass declared-MIME→signature match (FF D8 FF for JPEG, 89 50 4E 47 for PNG, etc.) before forwarding | 2026-04-20 | Active |
| Streaming byte counter via response.body.getReader(), never bare arrayBuffer() for capped binary downloads | Content-Length headers can be omitted or lie; only mid-stream byte counting reliably enforces a max-size cap. Cancel-and-return on cap breach | 2026-04-20 | Active |
| Probe-only env overrides for production constants must be NODE_ENV !== 'production' gated | PROBE_TYPING_REFIRE_MS / PROBE_CHAT_SERVICE_DELAY_MS / PROBE_CHAT_SERVICE_STUB / PROBE_MEDIA_HOST_ALLOWLIST all silently ignored in prod; assertAuthEnv prod-fail backstops the most dangerous ones | 2026-04-20 | Active |
| Cleanup state (timers, mutexes) belongs in try/finally wrapping the entire handler body | Per-return-path cleanup scattering creates leaks on unhandled paths (errors, returns from nested branches); single try/finally guarantees cleanup regardless of how the handler exits | 2026-04-20 | Active |

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
*Last updated: 2026-04-20 after v0.2 Phase 3 (WhatsApp Integration) complete — all 3 plans shipped (03-01 webhook + 03-02 probe + 03-03 typing/proactive/multimodal); ready for Phase 4 (Coolify Deployment)*
