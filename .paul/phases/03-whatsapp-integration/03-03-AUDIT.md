# Enterprise Plan Audit Report

**Plan:** `.paul/phases/03-whatsapp-integration/03-03-PLAN.md`
**Audited:** 2026-04-20 16:52 GMT+1
**Auditor:** PAUL Enterprise Audit Workflow (senior principal engineer + compliance reviewer persona)
**Verdict:** **Conditionally acceptable pre-fix → enterprise-ready post-fix.**

---

## 1. Executive Verdict

The plan's core scope (typing indicator, proactive opener, multimodal image) is well-bounded and builds cleanly on 03-01/03-02's probe harness + stub-mode scaffold. **However, as written, it would not pass a SOC2/ISO review for three reasons:**

1. **SSRF-permissive media download.** `downloadTwilioMedia(url, ...)` accepts any URL from a HMAC-validated payload without validating the host. A single validation bypass in upstream HMAC (or a Twilio-side forgery) hands an attacker the ability to enumerate internal services from production IP space (metadata endpoints, internal APIs, etc.).
2. **No content-level validation of downloaded bytes.** Declared `Content-Type: image/jpeg` + any body shape is accepted and forwarded to Anthropic vision API. Twilio could serve something else (unlikely) or a compromised upstream could.
3. **Byte-cap relies on Content-Length header alone.** A server omitting or misstating Content-Length defeats the 5MB cap and routes to memory exhaustion via `res.arrayBuffer()`.

All three are release-blocking but surgically fixable without architectural change. Additional cross-tenant and observability gaps are strong-recommends.

**Would I sign off on this plan for production AS-WRITTEN? No.**
**Post-audit fixes applied: would I sign off? Yes.**

---

## 2. What Is Solid (Do Not Change)

- **Driver-mode getter pattern for typing indicator** — mirrors 01-03 TwilioVerifyService; kill-switch works without redeploy. Correct layering.
- **Typing-indicator fire-and-forget with `.catch(() => {})`** — non-blocking; errors correctly don't change webhook status code.
- **TYPING_MAX_REFIRES hard cap** — runaway timer defense; correct magnitude (~2min).
- **Channel-scoped 24h session query** (`channel: 'whatsapp'`) — web conversations correctly don't suppress WhatsApp openers. Explicit AC-7.
- **SuggestionsService consumed read-only** — no coupling regressions vs 04-02.
- **Stub-mode preservation** (AC-8) — stub branch intentionally ignores attachment; schema has no image column; correct decision for POC.
- **PII-safe logging contract** — sha256Prefix on phones; byteSize + mediaType only, never base64. Extends 01-03/03-01 stance.
- **No schema changes** — image bytes not persisted; opener not persisted. Correctly scoped to avoid migration risk in a closure plan.
- **Try/finally wrapping handleInbound for typing cleanup** — avoids 5+ duplicated emit sites.
- **Zero new dependencies** — fetch + crypto + existing deps carry everything. Reduces supply-chain surface.
- **Twilio sandbox UAT explicitly deferred to manual checkpoint** — correct boundary; live UAT is out of scope for code-focused plan.

---

## 3. Enterprise Gaps Identified

### Security / Trust-Boundary

| # | Gap | Severity | Rationale |
|---|-----|----------|-----------|
| G1 | `downloadTwilioMedia(url, ...)` accepts any URL — SSRF vector | **Must-have** | HMAC-validated payloads are a trust boundary only for structural integrity; once an attacker proves a bypass (or Twilio-side forgery exists), media URLs can point at AWS metadata (169.254.169.254), internal Kubernetes services, Redis/DB admin UIs, etc. Even a small likelihood event has catastrophic blast radius |
| G2 | No magic-byte validation post-download — malformed "image" bytes forwarded to Anthropic | **Must-have** | Claude vision API is paid. Sending non-image bytes costs money with zero user value and may trigger safety filters that pollute downstream signal. More critically: "it's a JPEG because the server said so" is the oldest MIME-confusion bug in the book. |
| G3 | MIME allowlist lives only in ChatService Zod — WhatsappService crashes with ZodError on mismatch | **Must-have** | Plan says `mediaType: z.enum([...])` in ChatService, but download returns `Content-Type` blindly with `image/jpeg` fallback. If server returns `image/bmp` or `image/svg+xml`, the Zod rejection fires MID-HANDLER in WhatsappService. Need allowlist in download layer, not Zod. |
| G4 | Streaming byte cap relies on Content-Length header alone | **Must-have** | `await res.arrayBuffer()` reads the entire body. A server omitting Content-Length bypasses the cap check entirely and routes to memory exhaustion. Must be a streaming byte counter that aborts mid-read. |
| G5 | Proactive-opener query missing orgId scope | **Must-have** | `findFirst({ where: { venueId, userId, channel } })` — in multi-org users (staff at 2 pubs owned by different orgs), venueId+userId could resolve a ChatConversation from another org. Plan 02-01 established the pattern; this plan broke it. |
| G6 | Typing-indicator refireCount is zeroed on auto-stop — observability gap | **Must-have** | Plan says "clearTypingRefire returns `{ refireCount } | null`". If timer hits TYPING_MAX_REFIRES cap at 6, entry is removed; clearTypingRefire returns null; `whatsapp.typing_indicator_cleared` logs `refireCount: 0` — WRONG. Incident forensics would show "refire never fired" when in fact it hit the cap. |

### Observability / Auditability

| # | Gap | Severity | Rationale |
|---|-----|----------|-----------|
| G7 | SSRF-reject log would leak raw URL host | Strong-rec | Any log field containing raw URL host is an info-leak vector for future attackers tuning their next attempt. Hash hosts in SSRF-reject logs. |
| G8 | ChatMessage.content placeholder missing messageSid | Strong-rec (S2) | `[image: mediaType, byteSize]` gives no way to correlate row → original Twilio webhook for forensic queries. Add `sid:${messageSid}`. |
| G9 | Twilio typing-indicator REST API availability unconfirmed | Strong-rec (S7) | Plan says "confirm at audit time". Twilio WhatsApp Sandbox does NOT expose a typing-indicator REST endpoint; Cloud API equivalent varies. Decision MUST happen at PLAN, not mid-APPLY, otherwise executor stalls. Register D-03-03-F UP FRONT; ship console-mode unconditionally + best-effort REST. |

### Correctness / Content Handling

| # | Gap | Severity | Rationale |
|---|-----|----------|-----------|
| G10 | composeOpenerText missing sanitization | Strong-rec (S1) | Suggestions can include KnowledgeItem-derived text with WhatsApp formatting chars (`*`, `_`, `~`, triple-backtick) or control characters. No sanitization = formatting injection in user-visible output. |
| G11 | Probe W19 timing margin too tight | Strong-rec (S3) | 25s ChatService delay vs 20s refire leaves 5s margin. JS GC pause or system load flakes the assertion. Bump to 30s. |
| G12 | Probe imgServer lifecycle at risk of port leak | Strong-rec (S4) | Plan shows loose `imgServer.close()` in finally. If assertions throw before finally, port stays bound; subsequent runs fail. Need explicit try/finally at top level + wait-for-close. |
| G13 | No SSRF test bypass mechanism for probe | Strong-rec (S8) | Probe uses localhost:PORT+1 which won't match production host allowlist. Need dedicated `PROBE_MEDIA_HOST_ALLOWLIST` env (additive, only honored when NODE_ENV !== 'production'). |
| G14 | Cross-tenant conversation preflight missing pre-ChatService | Strong-rec | Even with M5 fix on opener query, resolved conversationId should be re-verified `venue.organizationId = member.organizationId` before ChatService dispatch. Defense-in-depth. |
| G15 | Concurrent same-user inbound race on session-window check | Can-defer (D-03-03-G) | Two webhooks within ms → both see "no prior session" → 2 openers. Acknowledged as single-region POC trade-off. |
| G16 | Per-turn Anthropic vision cost budget absent | Can-defer (D-03-03-H) | 5MB image → ~30k+ Claude vision tokens. Billing review gate, not release gate. |
| G17 | Image content moderation policy absent | Can-defer (D-03-03-I) | Relies on Anthropic's built-in filters. Trigger: first abuse incident OR consumer-facing deploy. |

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | SSRF-permissive media download (G1) | Task 3 downloadTwilioMedia + new AC-13 + boundaries + verification | Added `isHostAllowed()` helper with `TWILIO_MEDIA_HOST_ALLOWLIST` env + `DEFAULT_TWILIO_MEDIA_HOST_ALLOWLIST` in @gm-ai/types. Probe-only `PROBE_MEDIA_HOST_ALLOWLIST` gated on NODE_ENV !== 'production'. Host-check runs BEFORE fetch + redirect target re-validated. `ssrf-rejected` reason added to union. AC-13 covers behavior; host hashed in logs. |
| M2 | MIME allowlist missing in download layer (G3) | Task 3 downloadTwilioMedia + new AC-15 + @gm-ai/types | Added `ALLOWED_IMAGE_MIME_TYPES` const. downloadTwilioMedia checks Content-Type against allowlist BEFORE body read; returns `{ ok: false, reason: 'unsupported-mime', mediaType }`. WhatsappService emits specific fallback "I can only process JPEG, PNG, WebP, or GIF images." No more ZodError mid-handler. |
| M3 | Magic-byte validation absent (G2) | Task 3 downloadTwilioMedia + new AC-14 + verification | Added `magicByteMatchesMime()` helper validating FF D8 FF (JPEG), 89 50 4E 47 (PNG), 47 49 46 38 (GIF), RIFF...WEBP. Mismatch → `{ ok: false, reason: 'media-content-mismatch' }`. |
| M4 | Streaming byte cap via header alone (G4) | Task 3 downloadTwilioMedia | Replaced `await res.arrayBuffer()` with `response.body.getReader()` streaming loop. Total counted mid-stream; cancel-and-return on cap breach. Content-Length lies can no longer bypass cap. |
| M5 | Cross-tenant opener query missing orgId (G5) | Task 2 findFirst + Task 3 conversation preflight + new AC-16 + verification | Added `venue: { organizationId: member.organizationId }` to findFirst where-clause. Added pre-ChatService `findFirst` re-verifying `{ id: conversationId, venueId, venue: { organizationId: member.organizationId } }` with friendly fallback if mismatch. Mirrors Plan 02-01 hardening. |
| M6 | Typing refireCount wrong on auto-stop (G6) | Task 1 clearTypingRefire + AC-2 strengthen | Entry RETAINED at TYPING_MAX_REFIRES auto-stop with status='exhausted'; clearTypingRefire still returns accurate refireCount. Separate `whatsapp.typing_indicator_exhausted` log emitted on cap-hit. AC-2 strengthened to assert accurate refireCount post-auto-stop. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | composeOpenerText sanitization (G10) | Task 2 composeOpenerText + new AC-17 | Added `sanitizeOpenerLine()` with control-char strip, NFC normalize, WhatsApp formatting char strip, 200-char cap per line, total ≤400. Applied to every line pre-composition. |
| S2 | ChatMessage.content placeholder lacks messageSid (G8) | Task 3 ChatService + AC-4 strengthen | SendMessageInputSchema.attachment gains `sourceRef` field. Placeholder format `[image: ${mediaType}, ${byteSize}B, sid:${sourceRef}]` when present. WhatsappService passes `sourceRef: payload.MessageSid`. |
| S3 | W19 timing margin (G11) | Task 4 W19 + AC-2 | PROBE_CHAT_SERVICE_DELAY_MS bumped from 25000 → 30000 (10s margin past 20s refire). |
| S4 | imgServer lifecycle (G12) | Task 4 server lifecycle block | Explicit top-level try/finally around all 3 image servers (happy/corrupt/svg) with Promise.all close + wait. |
| S5 | SSRF-reject log would leak raw host (G7) | Task 3 WhatsappService image_download_failed log | `hostHash: sha256Prefix(url.host)` when reason === 'ssrf-rejected'. Never raw. |
| S6 | Cross-tenant conversation preflight (G14) | Task 3 additional whatsapp.service.ts block | Added `prisma.chatConversation.findFirst({ id, venueId, venue: { organizationId }})` pre-ChatService. |
| S7 | Twilio typing-indicator availability decision (G9) | Task 1 action — upfront decision block + D-03-03-F registration | Decision at PLAN time: ship console-mode + best-effort REST fail-soft; D-03-03-F registered in boundaries. Executor does NOT discover mid-task. |
| S8 | PROBE_MEDIA_HOST_ALLOWLIST mechanism (G13) | Task 4 env setup + Task 3 twilio-media-download isHostAllowed | Dedicated probe env, additive to production allowlist, NODE_ENV !== 'production' gated. Explicit setup + delete in probe try/finally. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | Per-(venueId, userId) concurrent-inbound mutex (G15) | Registered as D-03-03-G. Single-region POC; Twilio doesn't fan-out webhooks; race requires user fanning from 2 devices within ms. Acceptable for POC; revisit pre-multi-region or on incident report. |
| D2 | Per-turn Anthropic vision cost budget (G16) | Registered as D-03-03-H. 5MB image ~ 30k vision tokens. Not release-blocking; trigger = pre-public-launch billing review OR any venue exceeding $5/day. |
| D3 | Image content moderation policy (G17) | Registered as D-03-03-I. Anthropic's built-in safety filters cover baseline. Trigger = any abuse report OR consumer-facing deploy. |
| D4 | Typing-timer persistence across server restart | Acknowledged in boundaries. In-memory Map; pod restart drops; only affects in-flight requests; new requests re-establish. Acceptable. |
| D5 | WhatsApp Cloud API migration pre-emption | Not in scope. Twilio is the current mediation layer; migration triggers are separate plan. |

---

## 5. Audit & Compliance Readiness

**Defensible audit evidence:** YES post-fix.
- All security-material decisions emit structured logs (`whatsapp.image_download_failed` with `errorKind` discriminator; `whatsapp.typing_indicator_exhausted` for cap-hit; `whatsapp.cross_tenant_conv_mismatch` for defense-in-depth trigger).
- PII stance consistent with 01-03/03-01: sha256Prefix for phones, hostHash for URLs, byteSize/mediaType for binary metadata; no raw content anywhere.
- ChatMessage.content placeholder includes messageSid for forensic correlation → Twilio webhook replay.

**Silent-failure prevention:** YES post-fix.
- SSRF-reject, unsupported-mime, media-content-mismatch, media-too-large, media-download-failed each have distinct errorKind + distinct user-visible fallback.
- Typing-indicator cap-hit has dedicated log (`typing_indicator_exhausted`) distinguishable from normal cleanup.
- Proactive opener has 3 outcomes (sent / skipped-within-session / skipped-no-suggestions / error) all logged.

**Post-incident reconstruction:** YES post-fix.
- ChatMessage.content placeholder ties conversation history to Twilio MessageSid.
- `whatsapp.image_ingested { messageSid, mediaType, byteSize }` + `whatsapp.image_download_failed { errorKind, ... }` + `whatsapp.typing_indicator_*` form a complete state machine trail.
- X-Request-Id middleware from 05-01 propagates to all downstream logs (inherited).

**Ownership and accountability:** YES.
- All deferred items (D-03-03-F/G/H/I) have explicit triggers for re-opening.
- SuggestionsService consumed read-only — no cross-module ownership ambiguity.
- File list in frontmatter is complete (no new files introduced by audit; all audit fixes land in files already in scope).

**What would fail a real audit AS-WRITTEN (pre-fix):**
1. SSRF on inbound media URL → internal-network reconnaissance vector.
2. Magic-byte-less content forwarding → unknown-content exposure to paid third-party API.
3. Content-Length-only byte cap → denial-of-service via single large image.
4. Cross-org leak in proactive opener query.

All four are closed post-fix.

---

## 6. Final Release Bar

**What must be true before shipping:**

- [x] All 6 must-have fixes applied to PLAN.md (M1-M6).
- [x] All 8 strongly-recommended fixes applied (S1-S8).
- [ ] APPLY phase completes all 4 tasks with `build` + `probe:whatsapp ≥27/27` + `probe:api 61/61` + `probe:auth 54/54` green on 2 consecutive runs.
- [ ] UNIFY phase documents any deviations (especially Twilio REST typing endpoint observed availability — confirms or extends D-03-03-F).
- [ ] 4 deferred items (D-03-03-F/G/H/I) appear in STATE.md exit-gate block.

**Risks remaining even if shipped as-is post-audit:**

- D-03-03-F: Live-mode typing indicator is best-effort + console-only on Twilio failure. User sees typing in Sandbox (console-mode logs) but may not see it in live Sandbox until D-03-03-F is closed.
- D-03-03-G: Double-opener race under concurrent same-user inbounds. Single-region POC bound accepted.
- D-03-03-H: No vision cost cap. Accept via billing review.
- D-03-03-I: No image moderation layer. Relies on Anthropic.
- Twilio sandbox UAT is NOT run in this plan (by design). Separate manual checkpoint before Phase 4 go-live.

**Would I sign my name to this post-audit?** Yes — for POC / staff-only deployment at target venues with the explicit deferred-item gating documented. For public consumer surface, close D-03-03-G, D-03-03-H, D-03-03-I first.

---

**Summary:** Applied **6 must-have + 8 strongly-recommended** upgrades. Deferred **5** items with explicit triggers. AC count grew 12 → 17. Probe assertion target raised 23 → 27.

**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
