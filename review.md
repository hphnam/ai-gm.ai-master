# AI Chat Review — 2026-07-01

Full review of the AI chat (apps/api `chat` module + web chat UI) after the AI SDK overhaul.
Three parallel review passes: code correctness (verified against AI SDK 7.0.8 / @ai-sdk/anthropic 4.0.3
source), security (multi-tenant + prompt injection), and reliability/completeness against the product
bar: **fast-paced hospitality business, little to no mistakes, KB/SOP-grounded**.

## Decisions

- **Model: `claude-sonnet-5`** (adopted — was `claude-sonnet-4-6`). Near-Opus quality on tool-use/agentic
  work at Sonnet pricing. **Required a provider bump: `@ai-sdk/anthropic` 4.0.3 → 4.0.4** — 4.0.3's
  capability table doesn't know `claude-sonnet-5`, so it fell to the unknown-model branch and silently
  capped every reply at `max_tokens: 4096`. 4.0.4 adds Sonnet 5 to the 128k/adaptive tier and still pins
  `provider-utils@5.0.2` (matching `ai@7.0.8`), so no duplicate-package type skew — 4.0.5 pulls
  `provider-utils@5.0.3` and breaks the memory-tool `ToolSet` type. Pinned `^4.0.4`.
- **Thinking: adaptive on every turn** (was: incident-only). On Sonnet 5 this is effectively unavoidable —
  the provider maps `thinking:{type:'disabled'}` to *omitting* the param, and an omitted param on Sonnet 5
  runs adaptive by default, so a `disabled` branch is a misleading no-op. Embraced deliberately: the
  product bar is accuracy over latency, and adaptive self-moderates (trivial lookups think little).
- **Re-baseline cost after deploy** — Sonnet 5's tokenizer produces ~30% more tokens for the same text
  (per-token price unchanged at launch intro rates), and adaptive-everywhere adds thinking tokens the
  snap-answer paths previously didn't spend.
- **Fable 5 not adopted for the chat loop** — $10/$50 pricing, always-on thinking (latency), `refusal`
  stop-reason handling, and a 30-day data-retention requirement make it wrong for per-message chat.
  Candidate for `deep_research` and headless scheduled reports later, with `fallbacks: [{model:
  'claude-opus-4-8'}]` enabled.
- The installed `@ai-sdk/anthropic` 4.0.3 already supports the full new surface (adaptive thinking
  `display`, `effort` low→max, server-side `fallbacks`, `taskBudget`, server-side compaction) — future
  upgrades are config, not dependencies.

## Fixed in this pass (2026-07-01)

- [x] **Provider bump `@ai-sdk/anthropic` → 4.0.4** so `claude-sonnet-5` is a known model (128k output,
  adaptive thinking) instead of silently capping `max_tokens` at 4096. Verified no nested
  `provider-utils` copy. See Decisions for why 4.0.4 not 4.0.5.
- [x] **Thinking config corrected** — a `{type:'disabled'}` branch would never reach the wire on this
  provider; replaced with explicit `{type:'adaptive'}` on all modes (see Decisions).
- [x] **Force-finalise 400** — `prepareStep` returned `toolChoice: 'none'` after step 5; the Anthropic
  provider implements `'none'` by removing the tools array, and Anthropic rejects requests whose history
  contains `tool_use` blocks without a `tools` param — so every turn reaching 5 tool steps died with a
  generic error. Now injects a "finalise with what you have" system message instead; `stepCountIs(8)`
  is the real hard stop again. (`gm-agent.ts`)
- [x] **Auto-verify was a silent no-op with a false green badge** — `retrievedItemIds` collected
  `hit.id` (SearchableEntity row id) but the quote verifier and the thumbs-down re-tag queue look ids up
  in `knowledgeItem` → 0 matches → soft-pass → UI showed "Checked against sources" on answers that were
  never checked. Now collects `hit.entityId` for `knowledge_item` hits (checklist hits are already
  synthesized into knowledge_item hits with the parent id). Fixes auto-verify **and** the feedback
  adaptation loop. (`chat.service.ts`, both streaming + non-streaming paths)
- [x] **`POST /chat/stream` body was completely unvalidated** — no global validation pipe exists and
  `prepareStream` (unlike `sendMessage`) never re-parsed: missing/oversized `userMessage` and arbitrary
  `conversationId` strings went straight to Prisma/Anthropic. Now piped through
  `ZodValidationPipe(StreamChatMessageRequestDto)`. (`chat.controller.ts`)
- [x] **Tenant isolation on mock-ops tools** — `get_stock_below_par` / `get_stock_by_name` /
  `get_upcoming_cutoffs` passed a model-supplied `venueId` through with no org check (model inputs are
  prompt-injectable via uploaded docs); now guarded by `venueBelongsToOrg`. `get_supplier_by_name` /
  `add_supplier_note` operated on the globally-shared `MockSupplier` table (no org column) — now scoped
  through the stock→venue→org relation. (`tool-dispatcher.ts`, `mock-ops.service.ts`,
  `fast-lookup.service.ts`, `ops.researcher.ts`)
- [x] **Raw error text streamed to clients** — `onError` forwarded `err.message` (Anthropic/Prisma
  internals) into the SSE stream; now logs server-side and returns a static message.
  (`chat.controller.ts`)

## Open findings (ranked)

### Safety / correctness

- [ ] **Emergencies miss incident mode when it matters.** The classifying turn answers in `default`
  mode (classification persists in the background), and the streaming path classifies only the FIRST
  message of a thread — a mid-conversation emergency never flips the mode. `log_incident` is prompt-hoped
  and impossible after the step-5 finalise nudge. Fix: cheap synchronous keyword pre-filter that forces
  incident mode before the turn runs + per-turn reclassification. (`chat.service.ts:317-352`, `:1250`)
- [ ] **Zero-search hallucination path is unguarded.** The "no sources cited" warning fires only when a
  KB tool ran; a KB-type question answered from training data with zero tool calls gets no warning, no
  citation, and no auto-verify. Server can flag "answered without search" from an empty `toolCallLog`.
  (`citations.tsx:197-206`, `chat.service.ts`)
- [ ] **Verification is post-hoc and usually invisible in-session.** Auto-verify completes ~6s after the
  UI's post-stream refetch; the "couldn't verify" badge typically appears only after a reload, and no
  corrected reply is ever issued. Verifier fails open on timeout. Consider a socket push
  (`verify.updated`) + visible pending→verified transition, and a re-verify pass on `issues`.
- [ ] **Terminal-reply synthesis breaks on parallel calls.** `synthesizeTerminalToolReply` inspects only
  the LAST toolCallLog entry, but the prompt mandates `record_pricing_recommendation` in the same step as
  `generate_report` — success can persist as "couldn't produce an answer." Scan the final round for any
  terminal tool instead. (`gm-agent.ts:88`)
- [ ] **Outage reads as "not on file."** Tool throws become `ok:false` but nothing distinguishes
  "retrieval is down" from "no SOP exists" — during a Postgres/Voyage outage the model will confidently
  say "I don't have that on file." Surface a degraded-mode signal to the UI when find_knowledge errors.
- [ ] **Handover mode's stock briefing runs on mock tables** even for orgs whose real stock lives in
  Square — presented as authoritative. Route handover stock blocks through connected integrations when
  present. (`system-prompt.ts:22`, `tool-dispatcher.ts` mock-ops cases)

### Persistence / streaming

- [ ] **Assistant row persisted only after a 2.5s follow-up call inside `onFinish`** — reload in that
  window loses the answer the user read; if the insert throws it's gone permanently. Persist first
  (empty followUps), then update. (`chat.service.ts:1386-1406`)
- [ ] **Abort skips persistence even when destructive tools already committed** (create_task,
  log_incident, memory writes) — side effects with no chat-history trace. Persist an assistant row when
  the toolCallLog contains a successful write. (`chat.service.ts:1336-1350`)
- [ ] **Retry/regenerate duplicates user rows** (`useChat.regenerate()` re-POSTs the last user text);
  Stop makes the partial answer vanish on reload. (`chat-body.tsx:385-412`, `chat.service.ts:1205`)
- [ ] **Concurrent first-send races the conversation upsert** (find-then-create → P2002 500). Use
  `upsert`. (`chat.service.ts:1166-1196`)
- [ ] **`agent.generate` (non-streaming/WhatsApp path) has no timeout/abortSignal.** (`chat.service.ts:814`)

### Context / classification

- [ ] **Compaction blind spot:** up to 14 older turns can be neither verbatim in context nor covered by
  the cached summary between regens; tool results never enter the summary; a single null tool result
  downgrades that whole turn's replay to plain text. (`conversation-compactor.service.ts:63-74`,
  `chat.service.ts:70-117`)
- [ ] **Mode misclassification is permanent and invisible** — `incident`/`handover` stamps are never
  reclassified, the overlay suppresses retrieval/capture, and the UI shows nothing. Add re-classification
  + surface the active mode. (`chat.service.ts:337-339`)
- [ ] **Mode classifier waste/divergence:** default-mode threads re-classify the same first message every
  turn; streaming vs non-streaming paths disagree on which message they classify. (`chat.service.ts:322-352`)

### Security (lower severity)

- [ ] **Unsanitized doc/staff-derived text in the system message** — `sanitizeForBlock` covers only the
  business profile; org-chart content, KB titles/summaries, recently-answered Q&As (staff-authored),
  contacts, profileSummary, and priorSummary are injected raw into a system-role block. Sanitize all of
  them or move retrieval-derived content into an explicitly untrusted-content wrapper. (`gm-agent.ts`)
- [ ] **No rate limit on the chat entry points**; `deep_research` is an unbounded per-user cost
  amplifier (nested multi-agent pipeline). Add a Redis-backed per-user turn limiter + a dedicated
  deep_research limit. (`chat.controller.ts`)
- [ ] **User-profile refresh reads the user's messages across ALL orgs** into one org's prompt context —
  cross-org topic leakage for multi-org users. Filter by org. (`user-profile.service.ts:63-71`)
- [ ] **`record_kb_gap` gate races same-step parallel `find_knowledge`** (counter increments post-resolve).
  Count in-flight calls too. (`ai-sdk-tools.ts:96-108`)
- [ ] **Supplier-scoping side effects** (introduced by today's tenant fix, low severity): a `MockSupplier`
  with zero stock links is now invisible to every org's lookup (fine if seed guarantees ≥1 link per
  supplier), and a supplier linked across two orgs' venues stays readable/writable by both. Both are
  inherent to the no-org-column TEMPORARY `MockSupplier` table — resolved permanently when Square/Xero
  replaces the mock tables. Add an `organizationId` column if the mock tables outlive that milestone.

### Quality / process

- [ ] **No end-to-end chat eval.** `probe:eval`/`probe:section` gate retrieval only; the 259-line system
  prompt carries nearly all safety behavior and ships unmeasured. Build `probe:chat`: scripted turns
  asserting citation compliance, STRICT/LENIENT no-data phrasing, record_kb_gap firing, incident
  protocol, POS-over-KB priority. **Highest-leverage single addition** — and a prerequisite for safely
  iterating on the prompt or model.
- [ ] Prompt/implementation drift to watch: scheduled-report fires write placeholder content (prompt
  admits it); capture-flow step 6 ("confirm with returned summary + tags") is unreachable because
  `hasToolCall('save_knowledge_doc')` halts the loop before a follow-up text turn; failed terminal tools
  say "details are in the card above" but failed calls may render no card on reload.
- [ ] Web resilience: no model fallback on Anthropic outage; dropped connection mid-stream = generic
  error; follow-up pills depend on a post-stream refetch race.

## Verified solid (no action)

- AI SDK usage is correct against 7.0.8 source: `instructions` as `SystemModelMessage[]`,
  `stopWhen`/`hasToolCall` halt-after-result semantics (terminal replies see populated results),
  `providerOptions.anthropic.cacheControl` on the first system message is the right v7 mechanism, and the
  stable-first/dynamic-second split keeps the cached prefix byte-stable. `memory_20250818` wiring valid.
- Memory sandbox holds: path traversal blocked, 64-file/16KB/128KB caps, `jsonb_set` under `FOR UPDATE`
  can't clobber the sibling profile key.
- 20+ dispatcher tools validate org ownership of model-supplied ids; role gates (save_knowledge_doc,
  add_supplier_note, pricing recs, staff cross-assign) are enforced server-side, not prompt-only.
- Rate-limiter split (Redis-backed connect-pat/tool-invocation/dispatcher/OTP vs in-process anti-spam)
  is intentional — don't re-flag.
