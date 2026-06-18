# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| v0.2 Multi-Tenant WhatsApp (v0.2.0) — partial | 2026-04-27 (closed early at ~96%) | 2026-04-19 → 2026-04-27 | 4 phases, 12 plans (3 superseded mid-milestone), Phase 4 partial — 04-04/05 rolled forward into v0.3 |
| v0.1 POC (v0.1.0) | 2026-04-19 | ~2 active days | 5 phases, 13 plans, ~7,500 LOC across 120+ files |

---

## ◐ v0.2 Multi-Tenant WhatsApp (v0.2.0) — Partial / Superseded by v0.3

**Closed early:** 2026-04-27 at ~96%
**Duration:** 2026-04-19 → 2026-04-27 (~8 active days)

### Why closed early

Phases 1–3 + Phase 4 plans 04-01/02/03 fully shipped (auth + organizations, document ingest UI, WhatsApp via Infobip, broadened extraction, classifier + DocumentType taxonomy, procedural Checklist model). Phase 4 plans 04-04 (scheduler + WhatsApp notifications) and 04-05 (WhatsApp procedural runtime) were intentionally **not shipped under v0.2** — the project pivoted to a knowledge-graph architecture (v0.3 Neural Brain), and 04-04/05 are better delivered on top of the graph from day one rather than rebuilt later. v0.2's WhatsApp + procedural-runtime theme is now delivered by v0.3 Phases 3 + 4.

### Stats

| Metric | Value |
|--------|-------|
| Phases | 4 (Phase 4 partial) |
| Plans shipped | 12 (3 Twilio plans superseded mid-milestone by Infobip migration) |
| Plans rolled forward to v0.3 | 2 (04-04 → v0.3 Phase 3, 04-05 → v0.3 Phase 4) |
| Probe gates at closure | probe-api 61/61, probe-auth 54/54 (probe-whatsapp retired during 03-04 scope expansion) |

### Key Accomplishments

- **Auth + Organizations** — better-auth with Prisma 7 adapter; Organization + OrganizationMember + User.phoneNumber schema; sign-up + sign-in + invitation flows; NestJS AuthGuard + RoleGuard wrapping every controller; tenant scoping via type-split `withOrgScope` (org-direct) + `withOrgScopeVia` (join-scoped); URL-pin open-redirect guard; atomic sign-up + org creation via better-auth `databaseHooks.user.create.after`; security-headers middleware; HTTP logger redaction contract for `/api/auth/*`; `assertAuthEnv` boot-time env validation banning `process.env.X!`; phone-linking via Twilio Verify SMS OTP with kill-switch driver modes (later migrated to Infobip 2FA in 03-05).
- **Manager document upload UI + delete** — POST/GET/DELETE `/docs/*` with multipart upload, MIME validation (text/markdown/PDF via unpdf, DOCX via mammoth), `@RequireRole` manager-only, `sanitizeUploadTitle`, MulterExceptionFilter → 413, 30s extraction timeout, `docs.uploaded` + `docs.cross_org_denied` audit logs (SOC-2 CC6.6 symmetric on read+write+delete); KnowledgeItem cross-org leak on `venueId=NULL` rows closed via direct `organizationId` FK.
- **WhatsApp via Infobip** — full Twilio→Infobip provider migration (Phase 3 was originally Twilio Plans 03-01/02/03, all superseded mid-milestone after pre-flight UAT surfaced API friction). Infobip inbound (HMAC-SHA256 over raw body via `x-callback-signature`, JSON `results[]` payload), outbound (`POST /whatsapp/1/message/text` with App API key auth), media download with provider-agnostic 4-layer hardening (SSRF allowlist + MIME allowlist + magic-byte + streaming counter), typing indicator gracefully degrades to console-mode. SMS OTP also migrated to Infobip 2FA in 03-05 (`InfobipVerifyService` with pinId in-memory cache, FIFO eviction, shape validation, PII redaction). Project went 100% Twilio-free; D-01-03-F closed.
- **Broadened extraction** (04-01) — XLSX (exceljs) + CSV (csv-parse) + PPTX (officeparser AST-walking for per-slide output) + image-via-Claude-vision (Anthropic SDK with `MAX_CONCURRENT_IMAGE_EXTRACTS=3` semaphore + 15s queue timeout + cost calculator); shared `sanitiseError` factored to `apps/api/src/common/sanitise-error.ts`; magic-byte gating; per-MIME upload caps; `KnowledgeItem.sourceImageBytes` + `sourceImageMime` additive migration; HEIC dropped from AC-4 (Anthropic media_type union limitation, registered as D-04-01-J).
- **Classifier + DocumentType taxonomy** (04-02) — single `DocumentType` Prisma model with `schema Json`, per-tenant `organizationId`-scoped, `@@unique([organizationId, name])`. `CLASSIFIER_AUTO_ACCEPT_CONFIDENCE=0.7` project-wide constant. Owner hand-accepts each proposal (no cluster-and-promote — D-04-02-B). Inline-on-/docs modal + row badges (no dedicated taxonomy-inbox page — D-04-02-D).
- **Procedural Checklist model** (04-03) — `DocumentType.kind` + `Checklist` entity + `ChecklistExtractorService` with full audit envelope; 30s `AbortController` timeout on extractor; `MAX_CONCURRENT_CHECKLIST_EXTRACTS=3` semaphore; post-parse step-index normalization; `ChecklistInstanceKeySchema` Zod regex for downstream scheduler dedup; `docs.checklist_extracted` success audit log; `kindOverridden` boolean in `docs.type_accepted` log.
- **Enterprise audit workflow continued from v0.1** — every plan got formal enterprise audit before APPLY. Across v0.2: ~100+ upgrades applied (M+S), ~30+ items deferred with explicit triggers. Caught (among others): cross-tenant `KnowledgeItem.venueId=NULL` leak in 02-01 audit, SSRF + MIME + magic-byte + streaming-byte-counter hardening in 03-03 audit, HEIC `media_type` union mismatch in 04-01 audit, race-condition warn log in 04-03 audit.

### Key Decisions Carried Forward

- Provider migration: Twilio → Infobip (consolidated WhatsApp + SMS OTP under one API key + base URL)
- `DocumentType` per-tenant taxonomy (not enum) — owners hand-accept, classifier escapes through propose-new path
- `Checklist` as first-class entity (not just structured metadata) — schedule cadence + `instanceKey` dedup surface ready for v0.3 Phase 3 scheduler
- HEIC server-side conversion (sharp/heic-convert) deferred to v0.3 (D-04-01-J)
- 13 D-04-02-* deferred items + 10 D-04-03-* deferred items carry into v0.3 with concrete triggers

### Carry-Forward UATs (Outstanding into v0.3)

| Item | Origin | Note |
|------|--------|------|
| AC-11 /settings/phone walk | 01-03 | UI-only human walk |
| AC-10 cross-org isolation walk | 01-01 | UI-only human walk |
| AC-10 invitation flow walk | 01-02 | UI-only human walk |
| 04-03 operator UAT (AC-2/3/4/5/6/7/8) | 04-03 | Append findings to 04-03-SUMMARY.md without reopening loop |
| Infobip Portal UAT runbooks | 03-04, 03-05 | Both pending — Ryan running these post-deploy |
| D-01-02-F real email-verification flow | 01-02 | Public-deploy trigger |

### Plans Rolled Forward to v0.3

- **04-04 Scheduler + WhatsApp notifications** → v0.3 Phase 3 (Scheduler + Graph-Aware WhatsApp Notifications), now enriched with 1-hop graph context
- **04-05 WhatsApp procedural runtime** → v0.3 Phase 4 (WhatsApp Procedural Runtime), all retrieval flows through v0.3 Phase 2 graph layer

**Archive:** Full per-plan SUMMARY files preserved at `.paul/phases/0[1-4]-*/[plan]-SUMMARY.md`; ROADMAP.md v0.2 details collapsed under "Completed Milestones" details block.

---

## ✅ v0.1 POC (v0.1.0)

**Completed:** 2026-04-19
**Duration:** ~2 active days (2026-04-18 → 2026-04-19) across 3 Phase 1/2 sessions + 1 Phase 3 rescope-and-execute session + 1 Phase 4 session + 1 Phase 5 session

### Stats

| Metric | Value |
|--------|-------|
| Phases | 5 |
| Plans | 13 (from an initial 10; Phase 3 rescoped mid-milestone to 3 plans; Phase 5 split API surface from UI mid-milestone to 3 plans) |
| Files changed | ~120+ (unique across all SUMMARY `key-files`) |
| LOC shipped | ~7,500+ new lines across api / web / types |
| Git commits (milestone) | 8 on main (51af306, 88ab109, 11e6049, 1abd945, ceb81bb, 3569f16, 9efb5a5, fe88a8a, a12c78a) |
| Probe gates | probe-api 36/36 (A1..A22 + D1..D7), probe-retrieval 9/9, probe-adaptation 15/15, probe-eval 6/6 canned queries |

### Key Accomplishments

- **End-to-end hospitality assistant POC** — a staff member can open /chat, pick a venue (The Crown or The Anchor Bar), ask "what needs ordering?" or "how do I change the Carlsberg keg?" and get a grounded answer derived from live Postgres + mock_* ops tables + pgvector semantic retrieval over seeded SOPs; follow-up turns preserve context; proactive "below-par stock" and "supplier cutoff" suggestions surface on conversation open; thumbs feedback flows back into the adaptation loop.
- **Agentic knowledge architecture** — `KnowledgeItem { content, metadata Json, embedding vector(1024) }` with Claude-authored freeform metadata (doc types inferred per document, not enumerated; seeded docs emit 8–11 emergent keys each + 5/6 with populated crossRefs). Replaced the initial `SopDocument | StockItem` enum split mid-Phase-3 after a user diagnostic flagged the enum as contradicting agentic intent — `.passthrough()` Zod schema preserves emergent keys across the type boundary.
- **ToolResult<T> as universal service return contract** — `{ ok: true, data: T } | { ok: false, reason: 'no-data'|'not-supported'|'error', ... }` — every service method fail-soft (no throws escape); `guarded<T>()` wrapper intercepts Prisma/network exceptions and returns typed `fail('error', ...)`. KnowledgeRetrievalService + MockOpsService + ToolDispatcher all obey.
- **Claude tool-use chat engine** — max-6-round tool-use loop over `find_knowledge` + `get_stock_below_par` + `get_stock_by_name` + `get_supplier_by_name` + `get_upcoming_cutoffs`; venue context injected in system prompt per call; full conversation + tool provenance persisted (`toolCallLog` + `retrievedItemIds`); per-round `chat.claude_call` observability logs (round, stop_reason, input_tokens, output_tokens, latency_ms).
- **Adaptation loop with explicit cost ceilings** — `MessageFeedback` + `ReTagQueueItem` schema; MAX_RETAG_ATTEMPTS=3 failed-item lockout; MAX_ENQUEUE_PER_FEEDBACK=10; DRAIN_SOFT_DEADLINE_MS=60000; atomic queue-drain claim via `updateMany WHERE status='queued' + count===1` gate; probe-eval canned 6-query harness exits on ≥60% retrieval_hit pass rate.
- **REST API surface with boundary discipline** — ChatController / SuggestionsController / FeedbackController / VenuesController behind `zodPipe(Schema)` factory; canonical `ApiErrorResponse` with closed `API_ERROR_CODES` union; CORS origin allowlist via WEB_ORIGIN env; 32kb body-parser cap; X-Request-Id middleware + PII-safe `http.request` JSON logger (never logs body/query/param VALUES); Anthropic sendWithRetry on 429/5xx; cross-tenant 404-not-403 on venueId mismatch to avoid enumeration leak.
- **Next.js chat UI with observability wired browser-side** — Tailwind v4 + shadcn/ui (new-york) foundation; apiFetch singleton as single trust boundary for all network I/O; UUID v4 X-Request-Id per call + ApiError.requestId capture closing the 05-01 observability loop; URL-as-state (?venue=, ?conv=); React Query for all server state; react-hook-form + zodResolver; XSS-safe plain-text rendering (zero dangerouslySetInnerHTML, zero markdown libs, grep-enforced); WCAG AA baseline (role="log"+aria-live="polite", aria-label/aria-pressed, icon+text severity never color-only); App Router error.tsx + loading.tsx per segment.
- **Debug / observability panel with SOC-2-grade tenant isolation** — read-only `/debug/*` surface (3 endpoints, zero writes, zero live AI calls) exposing Phase 3/4 provenance via Prisma joins over persisted state; strict OR clause on retag queue (probe D5 guards cross-tenant leak on shared globals); dual content caps (server 2048-char toolCallLog.content + client 64KB JSON viewer with omitted-byte banner); dual-layer noindex defence (Next.js robots metadata + X-Robots-Tag response header + amber warning banner); 90-day retention gate via typed `RETENTION_90D_MS`; `debug.access` per-call structured log via shared `logAccess()` helper; `DebugRequestIdBadge` + `apiFetchWithMeta<T>()` surfacing X-Request-Id on success path for operator log correlation; probe-api raised 29 → 36 assertions.
- **Enterprise-grade audit workflow institutionalised** — every plan had a formal enterprise audit landing must-have + strongly-recommended upgrades before APPLY. Across 13 plans: ~80 upgrades applied, ~55 items deferred with explicit triggers. Zero plans shipped without audit review. Caught (among others): cross-tenant retag leak on 05-03, destructive DB change without approval checkpoint on 03-01, CROWN_VENUE_ID factual error on 04-02 that would have hard-failed probe on first run, agentic-emergence threshold claim without enforcement on 03-02.

### Key Decisions

(Full log in PROJECT.md Key Decisions table. Highlights:)

- Prisma 7 driver-adapter pattern (PrismaPg; adapter-pg not adapter-neon for env portability)
- Agentic KB + mock_* ops tables (type enums rejected mid-Phase-3; freeform `metadata Json` + Claude classification at ingest)
- `.passthrough()` Zod schema for metadata (closed schema defeats agentic emergence)
- `ToolResult<T>` discriminated union as universal service return contract (fail-soft, no exceptions escape)
- Honest retrieval no-data at 0.3 similarity threshold (better than hallucinating closest-but-irrelevant match)
- PII-safe audit logs across retrieval / http / debug layers (queryHash + queryLength never raw content)
- Venue context injected in system prompt per call (no Claude-asking-for-venueId)
- ChatModule exports ToolDispatcher alongside ChatService (SuggestionsService composes cleanly)
- `runDispatchWithTimeout` as ONLY path to ToolDispatcher.dispatch in non-Claude consumers (uniform timeout + error-log behaviour)
- SuggestionsService non-persistent (re-derivable from DB state; chat_messages stay purely dialog)
- Canonical ApiErrorResponse with closed API_ERROR_CODES (prevents per-endpoint drift; UI consumes one closed union)
- X-Request-Id middleware with PII-safe http.request JSON logger
- Cross-tenant GETs return 404-not-403 on venueId mismatch (avoids enumeration leak)
- URL-as-state (?venue=, ?conv=) for conversation persistence (POC has no auth)
- apiFetch singleton as single trust boundary for all apps/web network I/O
- Assistant content rendered as plain text with `whitespace-pre-wrap` (Claude outputs = untrusted XSS surface)
- WCAG AA baseline shipped pre-emptively (severity NEVER color-only)
- Read-only `/debug/*` surface: zero writes, zero live AI calls
- Tenant-strict OR clause on retag queue (permissive OR form leaks cross-tenant state drift — SOC-2 CC6.6 failure)
- Dual content caps: server 2048-char + client 64KB (prevents main-thread freeze on oversized toolCallLog)
- Dual-layer noindex defence for pre-auth /debug URL (NOT a replacement for auth)
- `RETENTION_90D_MS` typed constant gating debug queries (bounds GDPR subject-access scope)

### Remaining Deferred (post-POC scope)

| Item | Trigger |
|------|---------|
| Auth / multi-tenancy | Required before public deployment |
| Real Xero / Square OAuth + API | Next milestone — swap `mock_*` for live integrations |
| WhatsApp channel | Post-POC product direction |
| BullMQ + Redis queues | Post-POC scale concern |
| Streaming / SSE for chat | Post-POC UX enhancement |
| CI/CD pipeline + Docker | Post-POC deployment plan |
| ESLint / Prettier / Husky / lint-staged | Post-POC tooling plan |
| CSP headers + sanitized markdown renderer | Coolify deploy plan + XSS threat model |
| OTel metrics + log aggregation UI | Cross-service telemetry plan |
| HTTP rate limiting | Public-facing deployment OR probe >1 req/s sustained |
| pgvector HNSW/IVFFlat index | Corpus exceeds 1,000 embedded rows OR p95 retrieval > 500ms |
| Postgres statement_timeout | Corpus approaches 1,000+ rows OR retrieval > 3,000ms in prod |
| Radix dep version pinning (currently `"latest"`) | Post-POC tooling plan |
| Unit / integration / Playwright tests | Project-pattern deferral — probes + UAT substituted during POC |

---
