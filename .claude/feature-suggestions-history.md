# Feature suggestions history — gm-ai

_This file tracks suggestions across runs of the `useful-feature-suggestions` skill. It is read at the start of every run and written at the end. The patterns derived here teach the skill the project's taste over time._

---

## Project preferences (derived)

> No patterns yet — first run. Patterns will emerge after you triage suggestions below.

---

## Run on 2026-05-18

**Context summary at time of run**: pre-launch, no users, 20+ hrs/week budget, goal = "everything, close all loops, work on new features, the lot". Confirmed chat-v1 is current; chat-v2 is parked dormant code.

**Research summary**: Hospitality ops AI category researched. Direct competitors: Trail/Trail Evo Copilot, Toast IQ (Oct 2025 launch), Xenia, OpsAnalitica, MarginEdge. Key insights: AI-without-citations is universal complaint; WhatsApp-as-staff-channel is genuinely under-served; beerhall/brewpub ops-AI layer is empty; "everything app for staff" is documented anti-pattern.

### Accepted
- _Pending user triage_

### Rejected
- _Pending user triage_

### Deferred
- _Pending user triage_

### Pending (not yet triaged)
- **Make a decision on chat-v2: delete or wire as deep-research route** [1-day] — recommended as "if you only do one thing"
- **Surface chunk-level citations inline in every chat answer** [1-day]
- **Decisive onboarding instrumentation (PostHog, one funnel, one hypothesis)** [1-day]
- **Decide live-or-die on `pricing-recommendations/` module** [1-day]
- **Decide and write beerhall/brewpub positioning one-pager** [1-day]
- **PDF→checklist AI conversion (pull v0.4 procedural runtime forward)** [1-week]
- **Pre-bundled compliance starter library (UK hospitality core)** [1-month, conditional on positioning]
- **Beerhall vertical SKU — content + one brewery POS integration** [1-month, conditional on positioning]
- **Manager weekly venue digest via WhatsApp (downgraded from staff shift)** [1-month]

### Notes
- Synthesiser hallucinated half-built status on ScheduledReport LLM execution and Compliance UI in the first draft — critic caught and killed both. Lesson for next run: verify "X is half-built" claims against the actual filesystem before drafting, not after.
- Chat→task corrective-action loop was drafted as a suggestion but killed in critic pass — `create_task` tool fully implemented at `tool-dispatcher.ts:792`.
- Multi-venue analytics killed as stage mismatch (pre-launch with no multi-venue user).
- Suggestions 7+8+9 (starter library, beerhall vertical, weekly WhatsApp digest) are mutually reinforcing — the starter library is the empty-state fix, the vertical SKU is the positioning, the WhatsApp digest is the retention hook. Conditional on suggestion 5 (positioning call).

---

_Earlier runs appended below._
