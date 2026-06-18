# Handoff: investigate why `record_pricing_recommendation` never fires

_Created 2026-05-18 by Ryan + Claude. Read this start-to-end before doing anything. Next Claude session should treat this as the brief._

## The question in one line

The `record_pricing_recommendation` chat tool — fully wired backend, fully wired UI tool-card (shipped earlier today) — has fired **zero times** in 19 days of real usage by the co-founder Elliot Horner, despite him asking pricing questions constantly. Find out why and fix it.

## Why we know this matters

A diagnostic script (`apps/api/scripts/probe-elliot-usage.ts`) was run today against production NeonDB. It aggregated Elliot's chat activity (`elliot@lunebrew.com`, 46 conversations, 585 messages, 2026-04-29 to 2026-05-18).

Tool-call frequencies from his conversations:
- `find_knowledge`: 89
- `pos_get_labor_summary`: 14
- `pos_get_sales_summary`: 12
- `pos_search_items`: 7
- `pos_get_top_items`: 5
- `pos_get_payment_breakdown`: 4
- `pos_compute_cogs_from_percent`: 2
- `pos_get_cogs_summary`: 2
- **`record_pricing_recommendation`: 0**
- `present_checklist`: 0

Real pricing-shaped questions Elliot asked in the last 30 messages — any of which *should* have triggered `record_pricing_recommendation` per the system prompt:

- "What's the market rate on an IPA?"
- "Which beer could we probably put the price up on?"
- "Please pull the current till prices"
- "Do you want me to pull the current till prices so we can see where each one sits"
- "70% GP Target"
- "What's my gp margin been this week?"

Plus this entire week he's been doing P&L queries against Square — exactly the condition the system prompt describes for firing the tool.

## What the system prompt currently tells the model

From `apps/api/src/modules/chat/system-prompt.ts` (search for `record_pricing_recommendation`):

> When a margin / COGS / pricing / discount conversation surfaces a CONCRETE opportunity to change a price — e.g. `pos_get_cogs_summary` shows an item priced well under target margin, `pos_get_discount_usage` shows a discount eating revenue, or `pos_get_top_items` shows a runaway best-seller priced below comparable items — call `record_pricing_recommendation` alongside your reply. **Anchor every recommendation in numbers from a tool call THIS turn (current price, current GP %, the comparator); never invent prices or margins, and skip the tool if you have no supporting number.** Pass venueId from `<current_context>`, sourceItemRef + sourceItemLabel, currentPriceCents + recommendedPriceCents in pennies, and a one-or-two-sentence rationale citing the numbers.

The bolded clause is the prime suspect: **"skip the tool if you have no supporting number."** The model may be reading that as a strong don't-fire signal whenever it isn't 100% confident.

## Files to read in order

1. **`apps/api/src/modules/chat/system-prompt.ts`** — search for `record_pricing_recommendation`, `PRICING`, and `pos_get_cogs_summary`. Understand the full instruction.
2. **`apps/api/src/types/chat-tools.ts`** — Zod schema + tool description for `record_pricing_recommendation`. The description is what the model sees in the AI SDK tool registration. Check whether it's similarly conservative.
3. **`apps/api/src/modules/chat/ai-sdk-tools.ts`** — confirms which tools get registered with the agent. Verify `record_pricing_recommendation` IS in the registered tool list at runtime (not conditionally excluded).
4. **`apps/api/src/modules/chat/tool-dispatcher.ts:1157-1209`** — implementation. Note the role gate (manager/owner only) at line 1165. Elliot IS owner so this isn't the block, but confirm.
5. **`apps/api/src/modules/chat/gm-agent.ts`** — how the agent is built. Is there any tool-filtering logic that could be hiding `record_pricing_recommendation` from the model?

## Hypotheses to investigate (ranked by likelihood)

1. **Prompt is too conservative.** The "skip the tool if you have no supporting number" + "never invent prices" clauses, combined with the model's natural hesitancy, mean it never feels confident enough. The bar is set higher than the operator wants.
2. **Tool description (in `chat-tools.ts`) is too long / hedge-laden.** The AI SDK passes the description directly to Anthropic. If it's a wall of caveats, the model treats it as "use sparingly."
3. **Wrong tool-call order.** The system prompt says "alongside your reply" — but maybe the model emits text first and never gets back to tool-calling. Check whether the agent's stop conditions allow post-text tool calls.
4. **The condition phrasing is wrong.** The prompt says "fires when X, Y or Z" (cogs_summary, discount_usage, top_items) but Elliot's actual pricing questions don't trip those exact triggers — he asks broader questions like "what's the market rate on an IPA". The prompt may be over-fitted to specific tool-output patterns.
5. **Model is suggesting prices in text without firing the tool.** Worth checking 5-10 of Elliot's recent assistant responses to pricing questions — did the model SAY a recommended price but skip the structured tool call?

## Suggested investigation plan

A. **Read the 5 files above** (~15 min).

B. **Replay Elliot's last 10 pricing-related conversations against the current prompt.** Don't fire production traffic — load the transcripts, take the most recent assistant turn that should have fired the tool, prompt-test in isolation:
   - Use the existing `probe-chat-core.ts` or `probe-eval.ts` as a harness.
   - For 3-5 of these turns, paste them into a one-off script and check whether the agent fires the tool.
   - If it doesn't, vary the system prompt instructions (relax the "skip if no number" clause, sharpen the trigger conditions, make the tool sound less consequential) and re-run.

C. **Look at the assistant text in those turns.** Did the model recommend a price in prose without firing the tool? If yes → it understands the situation but feels the bar to FIRE is too high. Fix is prompt-level.

D. **Once you have a working prompt revision**, regression-test against:
   - A trivial pricing question ("hi, what's a fair price for a pint") — should NOT fire (too vague, no venue context)
   - A loaded pricing question with POS data context — SHOULD fire
   - A non-pricing question — should NOT fire

E. **Ship the prompt change**, regenerate any affected tests, run the existing pricing-rec spec, regression-test full chat specs.

## Useful SQL to look at Elliot's pricing turns in detail

The probe script is at `apps/api/scripts/probe-elliot-usage.ts`. To pull the full assistant response to a pricing question:

```sql
-- Last 10 user messages mentioning "price" / "GP" / "margin" plus the next assistant response
SELECT m.role, substring(m.content from 1 for 400) as content_first_400, m."createdAt"
FROM "ChatMessage" m
JOIN "ChatConversation" c ON c.id = m."conversationId"
WHERE c."userId" = (SELECT id FROM "users" WHERE email = 'elliot@lunebrew.com')
  AND (
    m.content ~* '(price|gp|margin|ipa|till|cogs)'
    OR m.role = 'assistant'
  )
ORDER BY m."createdAt" DESC
LIMIT 40;
```

Use the existing tsx-based pattern (see `probe-elliot-usage.ts`) — there's no `psql` in this environment. **Read-only queries only**; the dev DB is real prod data per CLAUDE.md.

## Context you'll need that's not in the codebase

- **Stage**: pre-launch, no paying customers, but Elliot is a real daily user (the co-founder's brewery — Lune Brewing). The product is being shaped around his usage.
- **Owner preference (from earlier session)**: surgical fixes preferred over scope expansion. He likes evidence-driven decisions. He's authorised the chat-v2 → chat-core rename and the citation work in the last day.
- **The card UI for `record_pricing_recommendation`** was shipped this morning (`apps/web/src/components/chat/tool-cards/pricing-recommendation-card.tsx`). That work assumed the tool fires; if the investigation finds the tool genuinely shouldn't fire (e.g. the use case doesn't materialise), the card becomes dead UI. Don't rip it out — fix the firing condition instead.

## Recently-shipped work in this codebase (so you don't undo it)

- `apps/api/src/modules/chat-v2/` was renamed to `chat-core/` (40 files; one orphan controller deleted). Don't reference the old paths.
- Citations system in `apps/web/src/components/chat/chat-message.tsx` got 3 additions today: `CitationsContext` + section listing in tooltip, `lastUpdated` in tooltip, `UncitedKbWarning` banner when KB tool fired but no `[doc:]` markers in reply.
- `pricing-recommendation-card.tsx` + `GET /pricing-recommendations/:id` endpoint shipped today.
- `docs/positioning.md` was drafted today based on Elliot usage analysis.

## How to start the new session

1. `/clear` this conversation
2. In the fresh session, paste or reference: *"Read `docs/handoff-investigate-pricing-rec-never-fires.md` and start the investigation."*
3. The new Claude reads this file, has full context, and picks up cleanly.

## Definition of done

- A specific root cause is identified (prompt phrasing, tool description, agent config, or a real product gap).
- A prompt or code change is shipped that meaningfully increases the chance of the tool firing in the right situations (validated by replaying 3-5 historical pricing turns).
- The existing pricing-recommendations spec still passes.
- The change doesn't break the role gate (manager/owner only) or any other safety guard.
