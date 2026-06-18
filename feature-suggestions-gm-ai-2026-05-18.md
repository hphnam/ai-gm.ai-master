# Feature suggestions: gm-ai

_Generated 2026-05-18 · Based on recon of /Users/ryan/Developer/Websites/gm-ai, context interview, and competitive research on hospitality ops AI category_

---

## Project understanding

_Confirm or correct before reading the suggestions — if I've misread the project, the suggestions will be off._

**What this is**: AI knowledge-and-operations assistant for hospitality venue general managers — chat over uploaded SOPs/supplier sheets/compliance docs and tabular CSV/XLSX data, on both web and WhatsApp, with task assignment, expiry/compliance reminders, incident tracking, scheduled-report generation, and Square POS integration.

**Stack**: Next.js (App Router, TanStack Query, react-hook-form) + NestJS + Prisma + Postgres + BullMQ + Redis + Voyage embeddings + Anthropic Claude + Twilio Conversations + better-auth, monorepo via Turborepo.

**Domain entities**: User, Organization, Venue, KnowledgeItem, KnowledgeSection, KnowledgeChunk, SearchableEntity, ChatConversation, ChatMessage, ChatStarterTemplate, Task, ExpiryRecord, ChecklistInstance, ChecklistStepCompletion, IncidentLog, Report, ScheduledReport, PricingRecommendation, Integration, WhatsappSession, WhatsappInvite, Notification, TabularRow, TabularColumn.

**Product surface**:
- Routes: `/onboard`, `/welcome`, `/chat`, `/chat/history`, `/dashboard`, `/reports`, `/reports/[id]`, `/reports/schedules`, `/compliance`, `/incidents`, `/tasks`, `/venues`, `/venues/new`, `/settings`, `/debug`, `/auth/*`
- Background work: nudges, task-reminders, expiry-scheduler (30/7/1/overdue windows), chat-starters (per-venue rotating prompts, 14-day Redis TTL), scheduled-reports (real LLM agent loop, not a stub)
- Integrations: Twilio Conversations (WhatsApp + OTP via Twilio Verify), Square POS (encrypted PAT, generic `Integration` model designed for multi-provider), Reducto (doc extraction), Voyage (embeddings + reranking), Anthropic (chat + report generation)

**Observations**:
- `chat-v2` is **40 files of dormant code** — registered in DI but `controllers: []`, no HTTP routes. `chat-v1` owns all live `/chat/*` traffic. Owner confirmed in Phase 2: reverted to v1.
- `ChecklistInstance` + `ChecklistStepCompletion` schemas exist but are **unused at runtime** — the v0.4 procedural-runtime placeholder.
- `PricingRecommendation` has module + service + controller + spec, **no processor/cron, no UI**. Recent commit `3c8baab` (May 13) fixed DI on it — actively maintained but unsurfaced.
- `ScheduledReport` is **fully shipped end-to-end**: `report-generator.service.ts` is a real 422-line agent loop with Anthropic + ToolDispatcher, web has `/reports`, `/reports/[id]`, `/reports/schedules`.
- `compliance/` UI exists at 313+208 lines (`compliance-body.tsx` + `add-expiry-dialog.tsx`) — also shipped.
- `create_task` chat tool is implemented at `tool-dispatcher.ts:792` and `task-action-card.tsx` has an onClick — the chat→task loop is wired.

**Stage guess**: pre-launch, late-build. _Evidence: v0.3 milestone is 3/4 phases shipped (hierarchical retrieval, tabular query, multi-agent chat). Recent work is web polish (dashboard, incidents UI, chat history pagination, sidebar badges, onboarding flow). No paying customers yet per Phase 2._

---

## Context

- **Users**: pre-launch — no users yet. Confirmed in Phase 2.
- **Current focus** (next 4-8 weeks): "everything — close all loops, work on new features, the lot". No single named needle; completion + new capability + ship are all in scope.
- **Time budget**: heavy, 20+ hrs/week. This is primary focus.
- **Signal sources**:
  - Phase 2 quote on chat-v1 vs v2: "I think we reverted to chat-v1? Please have a look at the current code. The chat is where we want to be." → suggestion 1.
  - CLAUDE.md note: "beerhall xlsx files in `docs/` are runtime canaries, not seed data" → strong indicator the original product vision was beerhall-shaped (suggestion 5 + 7).
  - Recent commits show pricing-recommendations DI fix `3c8baab` and hours-recovered fix `8e54d6f` — both half-built features actively touched but not surfaced to a UI.
- **Known half-built work the owner is aware of**: chat-v2 dormant module, ChecklistInstance schemas, PricingRecommendation no-surface.
- **Taste constraints from history**: first run — none yet.

_Note on confidence tags: every suggestion here is **Owner observation** or **Owner intuition** because the product has no users yet. The strongest signal anchor available is the codebase + the owner's stated direction. The single most leveraged thing to do once trials start is instrument and ask — see suggestion 3 and the "What to do when you have your first 5 users" note at the end._

---

## Competitive landscape

_Full document at `competitive-landscape.md` in this directory._

### Direct competitors

**Trail / Trail Evo Copilot** (Access Group, UK) — closest single-tool analogue: digital checklists + HACCP/SFBB + AI Q&A over uploaded SOPs. Multi-site, established.
- Strengths: pre-bundled SFBB compliance library (UK moat), sensor integrations (fridges/temperature probes), 30-day free trial, low training need
- Weaknesses (from reviews): heavier UI for very small independents; sold mid-market and up
- Notable: **no WhatsApp staff channel**, no tabular CSV/POS query path

**Toast IQ** (Toast, launched October 2025) — conversational AI manager assistant for Toast restaurants.
- Strengths: tight POS data integration, pricing/menu actions, voice channel
- Weaknesses: locked to Toast customers; can't serve operators on Square/Lightspeed/independent POS

**Xenia** — frontline ops execution with **AI PDF→checklist conversion** as headline feature.
- Strengths: AI template generation from uploaded PDFs, photo-required steps, conditional logic, maintenance work orders, computer-vision verification
- Weaknesses: AI-generated checklists need manual cleanup; younger product, smaller review pool

**OpsAnalitica** — restaurant/hotel checklist execution with corrective-action workflows.
- Strengths: fail-check → auto-task workflow (the loop competitors envy); franchise/multi-unit audit programs
- Weaknesses: less polished mobile UX, enterprise-y UI

**MarginEdge** — restaurant back-office automation (invoice OCR, daily P&L).
- Strengths: invoice OCR + daily P&L digest is universally praised in reviews
- Weaknesses: hard to export raw data; presumes a financial controller user

### Industry trends

- **AI-bolted-on-POS is the new battleground** — Toast IQ launched Oct 2025, Sevenrooms and 7shifts have AI surfaces. The bar has moved from "do you have ops software" to "does your ops software talk to me".
- **Frontline-staff app fatigue is real** — multiple reviews (Skyllful, Speakap) cite the "everything app for staff" anti-pattern; staff churn off apps that don't focus on the 6 things they do per shift.
- **AI hallucinations without citations** is the most common complaint across the chat-with-docs category (Glean, Sana, generic enterprise GPT wrappers).

### Unmet user needs (cross-product)

- **WhatsApp as the staff channel** for venue ops. Every WhatsApp Business AI vendor is customer-facing (orders, reservations). gm-ai's OTP-verified staff chat is genuinely novel.
- **Independent / 1-15-venue operators**. Trail and Toast IQ are mid-market+; Jolt/OpsAnalitica skew enterprise; Apicbase explicitly requires a committed back-office team. The owner-operator with a few venues is underserved.
- **Beerhalls / brewpubs / taprooms specifically**. Brewery POS market is mature (GoTab, Arryved); the ops-AI layer is generic restaurant kit, not beer-shaped.
- **Compliance reminders tied to expiry dates extracted from the document itself**. Most checklist apps require manual date entry. gm-ai's expiry-extractor → 30/7/1/overdue scheduler is unusual.

---

## Suggestions

### 1-day (≤ 8 hours)

#### 1. Make a decision on chat-v2: delete it, or wire it as a deep-research route

- **What**: `apps/api/src/modules/chat-v2/` has 40 files registered in DI but `controllers: []`. Either delete the module, or re-enable the controller behind an env flag (`@Controller('chat-v2')` to avoid colliding with chat-v1's `@Controller('chat')`) as the explicit deep-research fallback the comments reference.
- **Problem solved**: Cognitive load + bit-rot risk on a dormant code path. Ambiguity for you reading the repo in 3 months and for any future contributor (or AI agent) inferring intent.
- **Moves**: Completion — directly answers the question you asked in Phase 2.
- **Codebase anchor**: `apps/api/src/modules/chat-v2/chat-v2.module.ts` (`controllers: []`), `apps/api/src/modules/chat-v2/chat-v2.controller.ts` (still has `@Controller('chat')` despite being unregistered — a footgun if anyone re-adds the module to controllers), `apps/api/src/app.module.ts:45`.
- **Signal anchor**: Direct Phase 2 quote — "I think we reverted to chat-v1? ... The chat is where we want to be." Code confirms: chat-v1 owns the live HTTP surface.
- **Research anchor**: N/A — this is a finishing decision, not a competitive parity move.
- **How**:
  - Decide explicitly: delete vs keep-as-deep-research.
  - **If delete**: `rm -rf apps/api/src/modules/chat-v2/`, remove the import + entry in `app.module.ts`, run typecheck + tests, commit with a clear message. Recoverable from git history if you change your mind.
  - **If keep**: change the controller prefix to `@Controller('chat-v2')`, gate behind `CHAT_V2_ENABLED` env flag in the module's `controllers` array, expose a single Orval-generated client wrapper in `apps/web` for "deep research mode" the chat UI can opt into for hard queries.
  - Update CLAUDE.md with a one-line note on the decision so future-you (and Claude) doesn't drift.
- **Effort**: 2-4 hrs to delete; 6-8 hrs to keep as gated route.
- **Risk**: If you delete, you lose the multi-agent infrastructure (researchers, critic, writer) — but it's all in git history if you decide to revive it.
- **Dependencies / unknowns**: None.
- **Confidence**: Owner observation (strongest signal anchor in the report).

#### 2. Surface chunk-level citations inline in every chat answer

- **What**: gm-ai retrieves hierarchical chunks (KnowledgeSection + KnowledgeChunk) and reranks with Voyage — the citations are already in the retrieval response. Render them inline in the assistant message as footnote markers `[1] [2]` that expand to "Section X of {doc title}, last updated {date}", linked to the source doc.
- **Problem solved**: The single most-cited complaint in the AI-Q&A category is hallucinations without citations. Without prominent citations on day one, gm-ai inherits Glean/Sana-tier scepticism by default. With them, the first user verification moment ("let me check this") becomes a trust-builder instead of a trust-destroyer.
- **Moves**: Activation. The first GM who asks "what's our COSHH policy?" will check the answer; whether they can verify it determines whether they come back.
- **Codebase anchor**: `apps/web/src/components/chat/chat-message.tsx`, `apps/api/src/modules/retrieval/`, `apps/api/src/modules/chat/system-prompt.ts`, existing `ChatMessage.toolCallLog` field which already persists retrieval hits.
- **Signal anchor**: Owner observation — gm-ai is a knowledge product; citations are table stakes given you already have the data.
- **Research anchor**: Cybernews Glean review flags hallucinated answers as the top complaint; GetMyAI study reports 71% of hallucination complaints have no citation attached. Trail Evo Copilot and Toast IQ both surface source attribution (per competitive-landscape.md).
- **How**:
  - Ensure retrieval tool-call results include `{ docId, sectionId, chunkId, title, sectionPath, lastUpdated }` in the persisted `toolCallLog`.
  - Add a system-prompt instruction telling the model to emit `[1]`-style markers when grounding a factual claim, with a footnote table at the end mapping marker → chunk metadata.
  - Frontend: render markers as hover-tooltips with section title + an "Open source" deep-link to the doc viewer at the right section anchor.
  - Add a small banner on responses with zero markers: "No sources cited — this answer may be a guess." This is the disciplinary mechanism that makes the model cite reliably over time.
- **Effort**: 6-8 hrs.
- **Risk**: Claude won't perfectly emit markers on the first prompt iteration. Accept some misses and tune over 2-3 rounds.
- **Dependencies / unknowns**: None — all data plumbing exists.
- **Confidence**: Category norm (with strong research anchor) + Owner observation.

#### 3. Decisive onboarding instrumentation — PostHog, one funnel, one hypothesis

- **What**: Pick PostHog cloud (free up to 1M events/month), instrument the onboarding flow with 6-8 named events, and define a single saved funnel: `org_created → first_doc_uploaded → first_extraction_complete → first_chat_query_sent → first_chat_answer_received`. The single hypothesis to validate: **the embedding pipeline is the activation cliff**. If `first_doc_uploaded → first_extraction_complete` shows the biggest drop, you know exactly where to invest.
- **Problem solved**: Pre-launch, you have no signal. The moment 5 trial users arrive, you need to see exactly where they drop off — not guess. Every other suggestion in this report becomes higher-fidelity once you have funnel data.
- **Moves**: Discovery. This is the precondition for every signal-driven suggestion in future runs of this skill.
- **Codebase anchor**: `apps/web/src/app/(app)/onboard/`, `apps/web/src/app/(app)/welcome/`, the SearchAnalytics writer that already threads userId (commit `4221567`).
- **Signal anchor**: Owner observation — onboarding flow just shipped (commit `77041ee`); no usage data yet.
- **Research anchor**: "Long onboarding / setup time" is cited as a category complaint for OpsAnalitica, Apicbase, Trail. Your first 5 trialists will hit this — see where, don't guess.
- **How**:
  - Install PostHog JS (web) + Node (server). Reason to pick PostHog over Plausible: PostHog supports server-side events from BullMQ workers (needed to track `first_extraction_complete`), Plausible doesn't.
  - Wrap each onboarding step in `posthog.capture('onboard.{step}', { orgId, venueId, durationMs })`.
  - Server-side: emit `embedding.first_doc.complete` and `embedding.first_doc.failed` from the indexer worker.
  - Define one funnel insight in PostHog dashboard with the 5 events above.
  - Add a server-side `posthog.identify(userId, { orgId, plan, signedUpAt })` once on signup so funnel maps to identity.
- **Effort**: 6-8 hrs (install + 8-12 event calls + funnel + identify call).
- **Risk**: GDPR — pass only `orgId/venueId/userId` (UUIDs), never email/name/IP. PostHog's EU region handles residency.
- **Dependencies / unknowns**: New dependency (PostHog) — justified above.
- **Confidence**: Owner intuition (preparing for signal generation).

#### 4. Decide live-or-die on `pricing-recommendations/`

- **What**: Apply the same framing as suggestion 1. The module has controller + service + spec + DTO but **no processor, no cron, no UI surface, no chat tool**. Recent commit `3c8baab` (May 13) fixed DI on it. Make the decision: ship the minimum viable surface, or delete and stop carrying it.
- **Problem solved**: Same as chat-v2 — half-built code accumulates cognitive cost. "Recent commit on a feature with no user-facing surface" is the signature of "I keep meaning to finish this".
- **Moves**: Completion + clarity on whether commercial AI (pricing recs) is in or out of v0.3 scope.
- **Codebase anchor**: `apps/api/src/modules/pricing-recommendations/` (5 files: module, controller, service, spec, dto — no processor, no queue, no UI).
- **Signal anchor**: Owner observation — recent active commit but unsurfaced.
- **Research anchor**: Toast IQ's manager assistant emphasises pricing/menu actions; MarginEdge surfaces margin recommendations. Not core to the gm-ai positioning but a tangible commercial AI feature.
- **How**: Two paths.
  - **If keep**: 1-week scope on top of this 1-day decision — weekly cron pulls Square POS sales per item, calls Claude with structured output (`{itemId, currentPrice, proposedPrice, reasoning, confidence}[]`), persists `PricingRecommendation` rows, exposes a `getPricingRecommendations` chat tool, renders a tool-card with "apply" (writes to Square via existing integration), "dismiss", "remind later". Always draft — never auto-apply.
  - **If delete**: drop the module, remove the schema entries via a fresh Prisma migration (don't modify existing migrations per CLAUDE.md), commit. ~2 hrs.
- **Effort**: 1-2 hrs for the decision itself; the keep-path is 1-2 weeks of follow-up work.
- **Risk** (keep path): Bad recommendations in a venue context are worse than none. Mitigation: ship as drafts only, never auto-apply.
- **Dependencies / unknowns**: Square integration is already there. If keep, decide whether to expose this in the menu/chat or hide behind a beta flag for first users.
- **Confidence**: Owner observation.

#### 5. Decide and write the beerhall/brewpub positioning one-pager

- **What**: Before committing to any vertical content/integration work, make the gating call: is gm-ai positioning explicitly for beerhalls/brewpubs/taprooms, or staying generic-hospitality? Spend a day writing the ICP one-pager — target persona, problem statement, top 5 pre-launch SOPs they'd recognise, named brewery POS targets (GoTab vs Arryved vs both). If the positioning lands for you, suggestions 6 + 7 + 8 below fire. If it doesn't, you've spent a day and saved 4 weeks.
- **Problem solved**: Pre-launch positioning ambiguity. "AI GM for venues" is broad enough that no specific GM sees themselves in it. Niche commitments are scary; not committing is more expensive.
- **Moves**: Go-to-market clarity. Pre-launch, picking the niche matters more than any feature.
- **Codebase anchor**: N/A — this is a strategic call, not code. (But the codebase reveals the bias: CLAUDE.md notes beerhall xlsx files are runtime canaries, implying gm-ai was originally beerhall-shaped.)
- **Signal anchor**: Owner observation — the canary files plus your stated "everything, close all loops" framing means a niche call would unblock multiple other decisions.
- **Research anchor**: Beerhall/brewpub ops-AI layer is empty per landscape (brewery POS market mature but no AI ops layer). Trail and Toast IQ are sold mid-market+; the indie operator is underserved. (See competitive-landscape.md, "Under-served niches".)
- **How**:
  - 1 hour: list the 3 candidate ICPs you'd take seriously (e.g. independent beerhalls, multi-venue brewpub groups, taprooms-with-food).
  - 2 hours: write the ICP one-pager for whichever lands (problem statement, top 5 SOPs they'd need, decision-maker name, willingness-to-pay band).
  - 1 hour: name 5 real venues you could approach to validate.
  - 1 hour: decide POS integration target (GoTab vs Arryved vs Square-only-for-now).
  - 2-3 hours: rewrite the landing page hero + nav to match. If you don't have a landing page yet, write the headline + subhead + CTA copy in markdown.
- **Effort**: 6-8 hrs.
- **Risk**: Picking the wrong ICP. Mitigation: this is reversible — the code is generic, only the positioning is opinionated.
- **Dependencies / unknowns**: Whether you can actually meet 5 real beerhall/brewpub operators in the next 2-3 weeks.
- **Confidence**: Owner intuition (with codebase bias signal).

---

### 1-week (2-5 days)

#### 6. PDF→checklist AI conversion — pull v0.4 procedural runtime forward

- **What**: A user uploads a SOP PDF ("Opening checklist", "Cellar cleaning"). The existing ingestion pipeline extracts sections. A new endpoint feeds the structured content to Claude with a Zod schema → proposes a `ChecklistInstance` template with ordered steps, photo-required flags, conditional branches, owner role per step. User reviews, edits, saves as venue template. Ship the proposal flow first; defer execution surface to a second pass if time runs out.
- **Problem solved**: `ChecklistInstance` + `ChecklistStepCompletion` are unused schema placeholders for the v0.4 procedural runtime. Xenia's PDF→checklist AI agent is their headline feature. The hard part (ingestion pipeline) is already built — this is a thin layer on top.
- **Moves**: New capability + competitive parity with Xenia. Turns the corpus from "a thing managers ask about" into "a thing staff execute". This is also the v0.4 work pulled forward.
- **Codebase anchor**: `ChecklistInstance` + `ChecklistStepCompletion` in `apps/api/prisma/schema.prisma` (currently unused), ingestion pipeline (`indexer/`, `embeddings/`), new `apps/api/src/modules/checklists/`, new `apps/web/src/app/(app)/checklists/` route.
- **Signal anchor**: Owner observation — schemas exist; v0.4 explicitly deferred per ROADMAP.md. Pulling this forward uses existing pipeline.
- **Research anchor**: Xenia's PDF→checklist AI is the most-marketed feature in their stack and lands per landscape review. Trail's SFBB compliance library is largely PDF-sourced content turned into structured checks.
- **How**:
  - Define `ChecklistTemplate` Zod schema: `{ name, steps: [{ id, title, instructions, photoRequired, ownerRole, conditional? }] }`.
  - New endpoint `POST /checklists/propose-from-doc { docId }` — fetches the doc's sections via existing retrieval, calls Claude with structured output, returns the proposal.
  - Web UI: `/checklists/new` — pick existing doc OR upload → review proposed template → drag-reorder steps → save as venue template.
  - Persist to `ChecklistInstance` (template-shaped) with `templateName` and a `templateOf` self-FK if you want template/instance separation, otherwise add a `kind: 'template' | 'instance'` discriminator.
  - **Stretch goal** (only if first half ships in <3 days): mobile-friendly `/checklists/run/{instanceId}` execution surface with tick-off, photo capture, fail→`create_task` (the `create_task` tool already exists at `tool-dispatcher.ts:792` — reuse it).
- **Effort**: 5-7 days for proposal flow + persistence. Execution surface adds 2-3 days if pulled in.
- **Risk**: First-generation checklist proposals need manual cleanup (Xenia's documented complaint). Mitigation: ship the editable review step; never auto-save without user confirmation.
- **Dependencies / unknowns**: Whether `ChecklistInstance` becomes templates-and-instances in the same table or you add a separate `ChecklistTemplate` model — defer this decision into the work itself.
- **Confidence**: Owner observation + strong research anchor.

---

### 1-month (10-20 days, conditional)

_These three are conditional on suggestion 5's positioning call._

#### 7. Pre-bundled compliance starter library (UK hospitality core)

- **What**: 20-30 canonical SOP/policy markdown documents — opening/closing checklists, cleaning rotas, allergens (FSA 14 allergens), fire safety, manual handling, COSHH, food safety/HACCP, RIDDOR reporting, GDPR for venues — authored once and pre-loaded into every new org's KnowledgeItem table on signup, marked `isStarter: true`, fully editable/deletable. Optionally English + Spanish + Polish at minimum.
- **Problem solved**: Empty-state collapse. A new org has zero docs, so chat answers "I don't know what your policy is". A starter library makes gm-ai useful from minute 1 — the very first chat query gets a real, cited answer.
- **Moves**: Activation. Pairs with suggestion 2 (citations) to make the first query a trust-building moment.
- **Codebase anchor**: New `apps/api/content/starter-library/` markdown directory, ingestion pipeline, new seeding job triggered on `Organization.created`, `KnowledgeItem` schema (add `isStarter`, `starterVersion` fields).
- **Signal anchor**: Owner intuition (pre-launch). No user has asked for this; you'd build it because the empty state breaks the first impression.
- **Research anchor**: Trail's SFBB library is their explicit UK competitive moat per landscape research. Xenia, Jolt, OpsAnalitica all ship starter content. gm-ai's current empty-state is "do all the work yourself before the product helps you".
- **How**:
  - Author 20-30 SOPs as markdown — ideally reviewed by a real hospitality ops manager you can hire for a 1-day consult. This is the long pole, not the code.
  - On `Organization.created` event, queue a `seed-starter-library` BullMQ job that runs the docs through the normal ingest pipeline scoped to the new org.
  - Tag KnowledgeItems with `isStarter: true` + `starterVersion: '2026.05'`.
  - UI: small "Starter library" badge in the doc list; one-click "Replace with my own" action per doc.
  - Versioning: ship updates as new `starterVersion` values; prompt users with a "There's an updated starter doc — replace?" notification.
- **Effort**: 2-3 weeks. ~70% content authoring, ~30% code.
- **Risk**: Content becomes stale; gives the impression of "this is your policy" when it's a generic starter. Mitigation: the badge + explicit "customise this" copy + version stamp.
- **Dependencies / unknowns**: Finding a real ops manager to review content for accuracy. Whether to fork English content for US food code variants — defer to post-UK validation.
- **Confidence**: Owner intuition + research anchor.

#### 8. Beerhall vertical SKU — content + one brewery POS integration

- **What** (conditional on suggestion 5): If beerhall positioning lands, ship a vertical bundle. Beer-specific starter library (cellar cleaning by line type, keg rotation, draught troubleshooting, CO2 safety, beer style data, BBPA-style cellar management). Beer-domain extraction prompts that tag KnowledgeItems for `kegs`, `lines`, `beer_styles`. One brewery POS integration via the existing `Integration` model — GoTab or Arryved.
- **Problem solved**: Generic-restaurant ops AI is crowded (Trail, Jolt, Xenia, OpsAnalitica, Toast IQ). "AI GM for beerhalls" is empty. The repo already has beerhall canaries — finish the bet.
- **Moves**: Go-to-market — turns "interesting" into "this is for me" for the first 5 beerhall operators.
- **Codebase anchor**: New starter-library content (beer-flavoured fork of suggestion 7), classifier prompts in `indexer/`/`embeddings/`, new provider in `apps/api/src/modules/integrations/gotab/` or `arryved/` (follows the Square pattern — the encryption + per-domain registry are already there).
- **Signal anchor**: Owner intuition + the canary signal (beerhall xlsx files in `docs/`).
- **Research anchor**: Brewery POS market is mature (GoTab, Arryved, Brew Ninja, Crafted ERP per landscape) but the ops-AI layer is generic. Under-served niche.
- **How**:
  - Author 10-15 beer-specific SOPs alongside the suggestion 7 library, marked as `library: 'brewery'`.
  - Add classifier prompts: "if doc mentions keg/cask/firkin/style/ABV/CO2, tag as `beverage_inventory`".
  - Implement `apps/api/src/modules/integrations/gotab/` (or arryved) — register with `IntegrationRegistry`, implement `IntegrationProvider`, `validateCredentials` pings their API at connect-time per CLAUDE.md's existing pattern.
  - Wire 2-3 chat tools that pull from the new integration (e.g. `getKegSalesVelocity`, `getDraughtLineStatus`).
  - Marketing: vertical landing page or section, "for beerhalls" headline.
- **Effort**: 3-4 weeks. Content is 1-2 weeks; integration is 1 week (clone of Square pattern); marketing copy is 2-3 days.
- **Risk**: Locks you out of other verticals in operator perception. Mitigation: codebase stays generic; positioning + content can be rebranded if you pivot.
- **Dependencies / unknowns**: GoTab vs Arryved API access (decide in suggestion 5). Whether to launch with one or both.
- **Confidence**: Owner intuition + strong research anchor (conditional on 5).

#### 9. Manager weekly venue digest via WhatsApp (downgraded from staff shift digest)

- **What**: Existing `ScheduledReport` agent already generates per-venue reports. Add a WhatsApp delivery channel: when a manager has WhatsApp linked, deliver the weekly digest as a WhatsApp message (short summary card + a link to the full `/reports/{id}` view), in addition to email. Manager-only at first — staff-facing shift digest deferred until you see activation signal from real users.
- **Problem solved**: WhatsApp is the staff/manager channel for hospitality; the existing report generator already produces good content; the delivery hits a daily-active touchpoint without requiring a new entity or BullMQ job.
- **Moves**: Activation → retention. The recurring delivered message is the closest thing to a habit hook gm-ai has.
- **Codebase anchor**: `apps/api/src/modules/scheduled-reports/scheduled-reports.processor.ts` (delivery step), `apps/api/src/modules/whatsapp/` (existing Twilio Conversations integration), `apps/web/src/app/(app)/reports/[id]/` (the linked viewer).
- **Signal anchor**: Owner intuition — pre-launch, no real-user retention signal yet.
- **Research anchor**: WhatsApp as the staff/manager channel for venue ops is the under-served niche per landscape. The "everything app for staff" anti-pattern is documented; keeping this manager-only sidesteps it.
- **How**:
  - Add WhatsApp template message via Twilio (needs Twilio approval — 1-2 day lead time; start early). Template should be a short summary + a link.
  - Extend `ScheduledReport.deliveryChannels` (or add the field if not present) to support `'whatsapp'` alongside email.
  - On report generation completion, if the manager has a verified phone + the schedule includes WhatsApp, send via Twilio Conversations using the manager's `WhatsappSession`.
  - Settings UI: `/settings/notifications` toggle per channel per schedule.
  - Defer staff-facing shift digest until you have 5+ real users and activation data shows managers find value here.
- **Effort**: 1-2 weeks. Twilio template approval is the long pole.
- **Risk**: WhatsApp send cost per delivery × venues × frequency. Project the cost first. Mitigation: cap at 1 message per manager per week initially.
- **Dependencies / unknowns**: Twilio template content approval. The exact summary format that fits in a WhatsApp message (~1024 chars).
- **Confidence**: Owner intuition + strong research anchor on the channel choice.

---

## If you only do one thing

**Suggestion 1 — Make a decision on chat-v2 (1-day).**

It has the strongest signal anchor in the report: you explicitly asked the question in Phase 2 ("I think we reverted to chat-v1?"), and the codebase confirms it's true. Resolving it is 2-8 hours of work, removes 40 files of dormant code or commits to a real fallback path, and unblocks every future conversation about "is this codebase shipping or scaffolded". Pre-launch with a heavy time budget, the highest-leverage move is to remove ambiguity from the parts you'll be staring at for the next 6 months — and this one comes with the user (you) already half-decided.

---

## Considered and rejected

- **"Finish the ScheduledReport LLM execution"** — Rejected: **already shipped**. `report-generator.service.ts` is a real 422-line agent loop with Anthropic + ToolDispatcher; `/reports`, `/reports/[id]`, `/reports/schedules` all exist in the web app. The synthesiser caught this in the critic pass.
- **"Build the compliance/expiry UI"** — Rejected: **already shipped**. `apps/web/src/app/(app)/compliance/page.tsx`, `compliance-body.tsx` (313 lines), `add-expiry-dialog.tsx` (208 lines) all exist. Critic pass caught this.
- **"Wire the chat→task corrective-action loop"** — Rejected: **already shipped**. `create_task` tool is fully implemented at `apps/api/src/modules/chat/tool-dispatcher.ts:792`, `task-action-card.tsx` has an onClick. If a polish gap exists, it's a 1-hour audit, not a feature.
- **"Multi-venue group analytics dashboard"** — Rejected: stage mismatch. Pre-launch with no multi-venue user; rubric explicitly rejects "scaling features for pre-launch products". Build it when the first multi-venue trialist exists.
- **"Daily staff WhatsApp shift digest"** — Rejected as original-scope (replaced by manager-only weekly version, suggestion 9): retention before activation, requires a `Shift` entity that doesn't exist, daily Twilio cost projection ungrounded. Revisit post-launch once managers find value in the weekly version.
- **"Add Sentry / observability / monitoring"** — Rejected: best-practice slop without a specific debugging incident to anchor it.
- **"Add tests / improve test coverage"** — Rejected: not tied to a specific failure mode.
- **"Migrate to event-driven architecture / consolidate microservices / change ORM"** — Rejected: architecture rewrites disguised as features. Surface as architecture notes if relevant.
- **"Add dark mode"** — Rejected: feature theatre.
- **"Add a public roadmap page / referral program / gamification"** — Rejected: feature theatre + no signal.
- **"Integrate fridge / temperature sensors"** — Rejected: hardware bet with capital + supply chain implications, too heavy pre-launch.
- **"Add AI photo grading on checklists"** — Rejected per landscape research: documented anti-pattern (operators disable CV verification after false-positive frustration).
- **"Add a voice/phone channel like Slang.ai"** — Rejected: adjacent category, gm-ai is a knowledge product; voice would be a different bet that should follow user signal, not precede it.

---

## Architecture notes (optional)

- **chat-v2 module is the largest piece of dormant code in the repo.** Whatever decision you make on suggestion 1, document it in CLAUDE.md so future Claude sessions don't try to "use chat-v2" or hallucinate its state.
- **Two `@Controller('chat')` decorators coexist** in the codebase (chat-v1 active, chat-v2 unregistered via `controllers: []`). This is brittle — if anyone re-adds `ChatV2Controller` to its module's controllers array without changing the prefix, NestJS will throw a duplicate-route error at boot. Either rename chat-v2's controller prefix or delete the file as part of suggestion 1.
- **The `Integration` model is well-designed and underused.** Square is the only live provider. Suggestion 8 would exercise the design with a real second provider (GoTab/Arryved) — the test will be whether the per-domain registry, encrypted credential model, and `validateCredentials` ping all hold up when a non-Square provider gets added.

---

## What to do when you have your first 5 users

_Discovery-mode addendum, because the signal layer matters more than any single feature pre-launch._

1. **Have suggestion 3 (PostHog instrumentation) shipped before user #1.** The first 5 users without instrumentation give you stories; with instrumentation they give you data.
2. **Ask 3 questions of each of the first 5 users in their first week**:
   - "What was the first chat answer that surprised you — good or bad?" (calibrates the citation work in suggestion 2)
   - "What's a piece of paper or spreadsheet you opened this week that you wish gm-ai had answered first?" (surfaces feature gaps grounded in real workflow)
   - "If you cancel in 30 days, what's the most likely reason?" (pre-mortem the most likely churn driver)
3. **Once 2 of 5 have used WhatsApp**, push suggestion 9 (manager weekly digest) hard — that's your earliest retention hook.

Re-run this skill after the first 5 users have been live for 2-3 weeks. The signal will completely reshape the suggestion mix — and the rubric demands it.

---

## Triage — please react

_Go through the suggestions above and tell me:_

- Which you'll **accept** (planning to build)
- Which you **reject** — and **why** (this is the most valuable thing you can tell me; it tunes future runs)
- Which you'll **defer** (not now, maybe later)
- Anything you'll leave **pending** is fine; just say so

_Your responses get written to `.claude/feature-suggestions-history.md` and applied as constraints next time._
