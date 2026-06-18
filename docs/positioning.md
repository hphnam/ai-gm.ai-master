# gm-ai positioning — v1 strawman (2026-05-18)

Drafted from real-product evidence: 19 days of Elliot Horner's usage at Lune Brewing (586 messages, 46 conversations, 70+ knowledge items, heavy Square POS integration). Treat every claim below as opinionated and editable — the point is to commit, not hedge.

---

## TL;DR

**gm-ai is the AI operator for independent pub, brewpub and beerhall managers — the one place to ask "what's my GP today, who's still on shift, and how do I clean a beer line" without leaving chat or learning new software.** Anchored in Square (and brewery POS next), with your venue's actual SOPs and supplier sheets in the loop.

## ICP — the one person

**Owner-operator of 1-5 venues, primary concept is a brewpub / beerhall / craft-led pub.** UK-first. They:

- Run the business hands-on, not from a back office. No financial controller, no full-time ops director.
- Own the P&L conversation daily, not weekly — they want to know last night's margin this morning.
- Already use a modern POS (Square dominant; GoTab/Arryved/Toast in adjacent variants).
- Have SOPs in their head, in the bar manager's head, on the cellar wall, and in WhatsApp.
- Care about beer-specific operational competence (cellar temps, line cleaning, keg rotation, dispense troubleshooting) — generic restaurant tools don't speak their language.

**Concrete example: Lune Brewing's Beer Hall.** Operator runs the brewery + tap rooms + sister sites. Asks gm-ai daily for P&L by venue, labour cost yesterday, what to price up next, who they call when the ice machine breaks. 30 messages a day, 19 days in, still accelerating.

## The problem

GMs of brewpubs and craft-led pubs run the business across four broken surfaces:

1. **POS** (Square) — has the numbers but no narrative. Knowing GP requires manual reconciliation against COGS.
2. **Spreadsheets** — for the things POS doesn't track (labour per shift vs sales, cellar logs, pricing history).
3. **Tribal knowledge** — vendor contacts, troubleshooting, opening/closing rituals, all in people's heads.
4. **WhatsApp groups** — operational chatter, half-decisions, drift-prone procedures.

Switching contexts between these takes time the GM doesn't have. The cost shows up as: questions answered slowly or wrongly, knowledge lost when staff leave, decisions made on yesterday's instinct instead of today's numbers, margin gradually slipping in places no one's watching.

## The promise

**gm-ai is the operator copilot for craft-led pub and brewpub managers.** One chat surface, grounded in your POS data and your venue's actual SOPs, that:

- Answers daily P&L / margin / labour questions live from Square — no spreadsheet gymnastics.
- Pulls compliance, cellar, and ops procedures from your own docs (and a starter library that knows what a keg is).
- Lets the GM capture new SOPs in the same conversation that surfaced the question — corpus grows where the problem appears.
- Cites every claim back to the source document so trust is verifiable, not asserted.

Web today; WhatsApp staff channel next.

## Top 10 questions a Lune-shaped GM asks (drawn from real usage)

These are the exact use cases the product proves it solves today:

1. *"P&L for last night?" / "What's my GP yesterday?"* — Square sales + COGS reconciliation
2. *"What did I spend on staff yesterday?"* — labour summary by venue / day
3. *"Which beer could I put the price up on?"* — pricing intelligence vs current till
4. *"What's the market rate on an IPA?"* — external benchmark + recommendation
5. *"Who's still working?" / "Who has worked today but no longer is?"* — live shift state
6. *"How do I clean a beer line?" / "What do I do about a flat pint?"* — beer-specific SOP retrieval
7. *"Who do I call if the ice machine is down?"* — vendor / maintenance contact lookup
8. *"What day last week could we have been tighter with staff?"* — week-over-week labour vs sales
9. *"Save 'metrics we need' as an SOP and notify the team."* — knowledge capture inside chat
10. *"How do I order crisps?" / "What's the supplier for X?"* — supplier-and-process lookup

Every one of these is a real verbatim question pattern from Elliot's last 30 days. The product handles all ten today.

## What's in the starter library (the "they'd recognise it" set)

If a brewpub GM signed up tomorrow and we pre-loaded their org with these, they'd nod:

- **Cellar SOPs**: line cleaning cycles (lager 14d / cask 7d / craft 14d), keg rotation, gas canister handling, cellar temperature ranges, draught troubleshooting (flat pint, sticky tap)
- **Compliance**: HACCP / Safer Food Better Business, allergens (FSA 14), fire safety, manual handling, COSHH, DPS responsibilities, Premises Licence requirements
- **Daily ops**: opening checklist, closing checklist, weekly cleaning rota, shift handover template
- **Commercial**: gross profit margin targets (70% baseline for wet sales), pricing tier ladders (half / pint / cocktail / wine by-glass)
- **People**: rota planning, escalation ladder, manager onboarding

This is the 25-30 doc starter library that pre-launch suggestions 7 + 8 deliver.

## POS integration strategy

Vertical commitment forces a POS commitment.

- **Now**: Square (already shipped — 62 POS tool calls in Elliot's 19 days)
- **Next (within 90 days post-launch)**: GoTab OR Arryved — pick one based on which is more common across the next 5 target operators
- **Later**: Toast (largest US footprint), Lightspeed (UK independents)
- **Never (yet)**: enterprise restaurant POS (Oracle, NCR Aloha). Wrong segment.

The `Integration` model is already designed for this — each provider drops into the registry without touching chat-tools wiring. The lift per POS is real but bounded: one provider module, one credential flow, one set of POS tools.

## Anti-ICP — who this is NOT for

Hardcoded so we don't drift:

- **Enterprise restaurant chains** (Wagamama, Pret, JD Wetherspoon). They have ops directors, custom BI, IT departments. Wrong buyer, wrong cycle, wrong scale.
- **Hotel groups.** Different ops shape (housekeeping, room turnover, front desk). Margedge / Mews / Cloudbeds territory.
- **QSR / fast-casual** (Subway franchises, etc.). Lower margin density per question, different vendor ecosystem.
- **Generic restaurants with no beer programme.** They can use it, but they won't see themselves in the marketing copy. That's deliberate.
- **Operators who can't or won't connect their POS.** Without Square/GoTab/etc. wired in, gm-ai loses half its job. We do not market to "AI for SOPs only" — that's Trail Evo's lane.

## Competitive positioning (one-liners)

- *vs Trail Evo Copilot:* Trail is checklist execution + AI Q&A on SOPs. We're operator copilot grounded in POS data — Trail can't answer "what's my GP today" because it doesn't talk to Square.
- *vs Toast IQ:* Toast IQ is brilliant if you're on Toast. We serve the operators Toast can't — Square, GoTab, Arryved, indie POS.
- *vs Xenia:* Xenia is mobile-first checklist execution with AI PDF conversion. Adjacent, not overlapping; we'd happily borrow their PDF→checklist pattern (planned v0.4) but the daily-driver shape is different.
- *vs MarginEdge:* MarginEdge is back-office for the controller. We're front-of-house copilot for the operator. Different user, different cadence.

## Landing page above-the-fold (draft copy)

**Headline:** *Your AI operator for the brewpub. Today's margin, tonight's labour, last week's cellar log — one chat.*

**Subhead:** *gm-ai connects your Square (or GoTab) data with your venue's own SOPs so your GM stops switching between five tools to answer one question. Built with a brewpub operator, in production at a 4-pub craft group.*

**CTA:** *Try it with your venue's docs — 14-day free trial, no credit card.*

## Why now / why us

- **The data says it works.** 19 days, 586 messages, accelerating. One operator doing this isn't validation — but it's strong evidence the shape fits.
- **The codebase has been beerhall-shaped from day one.** The runtime canaries in `docs/` are beerhall SOPs. The classifier was tuned on craft-pub document types. This isn't a pivot; it's a commitment to where the product naturally lives.
- **The category is empty.** Trail/Toast/Xenia/MarginEdge are all real but none ship a daily P&L answer + cellar SOP retrieval + active corpus-capture in one chat. The brewery POS ecosystem (GoTab, Arryved) has no AI-ops layer.
- **Founder is the design partner.** Elliot runs four pubs and a brewery. He's been using gm-ai daily, building the corpus, surfacing the gaps. We are not pre-launch guessing; we are pre-launch with a built-in customer doing real work.

---

## The real launch problem (not positioning, but worth naming)

Positioning answers "who is this for." The data flags a different, more urgent problem: **only Elliot uses gm-ai inside his group**. His GMs and bar manager — the original target users — are not on the system yet.

Before chasing new orgs, the launch question is: *what's the smallest thing that gets Elliot's bar manager and head GM to send their first chat?* Candidates: WhatsApp activation (zero usage today), a staff-facing onboarding flow tuned for shift workers (not org owners), pre-loaded library reducing the empty-state, role-gated "for staff" mode.

This isn't in scope for the positioning doc. It's the first product question after the positioning lands.

---

## Decisions this doc commits to

1. **Vertical**: brewpub / beerhall / craft-led pub. UK-first.
2. **Primary user**: owner-operator GM, 1-5 venues, hands-on.
3. **Primary integration**: Square now, one of {GoTab, Arryved} within 90 days post-launch.
4. **Anti-ICP**: enterprise chains, hotels, QSR, POS-disconnected operators.
5. **Differentiation thesis**: POS-grounded operator copilot, not SOP-only retrieval.
6. **First launch problem**: not new orgs — team adoption inside Lune.

If any of these don't sit right, the call to redirect costs nothing today and 4 weeks if we wait until vertical content + integration work has been done on top.

---

## Evidence appendix (paraphrased, no raw chat content)

Drawn from `apps/api/scripts/probe-elliot-usage.ts` against the production NeonDB on 2026-05-18.

- **Usage**: 46 conversations, 585 messages, 19 calendar days, 100% web channel.
- **Tool calls (all-time)**: find_knowledge 89, POS tools combined ~62 (labour 14, sales 12, shifts 7, items 7, top_items 5, payment 4, COGS 2, others), query_document_table 30, save_knowledge_doc 25, record_kb_gap 16, generate_report 9.
- **Corpus**: ~70 knowledge items across ~30 document types. Beerhall-specific terms saturate (cellar, keg, line cleaning, gas, dispense, lager, IPA, half pint, DPS, Premises Licence).
- **Citation rate**: 7% of assistant messages cited a source; 82% of KB-tool-bearing replies shipped uncited. (The UncitedKbWarning shipped 2026-05-18 addresses this.)
- **Tools never fired**: record_pricing_recommendation (0), present_checklist (0). Despite the system prompt knowing about both. Investigate before declaring these features production-validated.
- **Team adoption**: Elliot (585 msgs) and Ryan (385 msgs, dev testing). Zero other team members.
