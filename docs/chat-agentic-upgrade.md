# Chat Backend — Agentic Upgrade

Upgrade the streaming chat path from a manual `streamText` loop with parsed delimiters to a first-class `ToolLoopAgent` with reasoning, structured follow-ups, abort handling, and full part persistence.

Against AI SDK 6.0.168 + @ai-sdk/anthropic 3.0.71. Docs bundled under `node_modules/ai/docs/`.

## Items

- [x] **1. ToolLoopAgent** — new `apps/api/src/modules/chat/gm-agent.ts`. `ChatService.prepareStream` now does `agent.stream({ messages, abortSignal })`. Reusable config for a later WhatsApp share.
- [x] **2. Adaptive thinking (reasoning)** — `providerOptions.anthropic.thinking: { type: 'adaptive' }`. `ChatMessage` renders `part.type === 'reasoning'` as a collapsible "Thinking" accordion (`apps/web/src/components/chat/chat-message.tsx`).
- [x] **3. `stopWhen` budget + early stop** — `[stepCountIs(20), hasToolCall('save_knowledge_doc')]`. Destructive writes are terminal.
- [x] **4. Structured follow-ups** — new terminal `suggest_followups` tool in `gm-agent.ts`. `---FOLLOWUPS---` delimiter + `parseFollowUps` regex path retired for the streaming path. `onStepFinish` captures the tool result and persists into `ChatMessage.followUps`. Prompt updated.
- [x] **5. Capture subagent — deferred**. The capture protocol is a multi-turn *user* dialog, not a synchronous tool delegation — the AI SDK subagent pattern doesn't fit. Prompt-level STEP 5 (DRAFT & CONFIRM) already gives the user an approval moment. Revisit if we decide to move to a dedicated "capture" UI surface.
- [x] **6. Tool approvals — deferred**. Setting `needsApproval: true` without a matching client approval UI would hang the loop. Keeping the prompt-level draft-and-confirm in STEP 5. Implement properly when adding `addToolApprovalResponse` wiring client-side.
- [x] **7. `onStepFinish` over `experimental_onToolCallFinish`** — `chat.service.ts` feeds `onStepFinish` into the agent which merges it with the agent's own onStepFinish. Tool calls + results backfilled into the `toolCallLog` in one place.
- [x] **8. Sequential tool use** — `providerOptions.anthropic.disableParallelToolUse: true`.
- [x] **9. Abort on disconnect** — `chat.controller.ts` creates an `AbortController` and wires `res.on('close')` to `abort()`. Signal threads through `prepareStream → agent.stream`.
- [x] **10. Persist full parts + reasoning** — additive migration `20260422150000_chat_message_reasoning_parts` adds `reasoning TEXT` + `parts JSONB` to `ChatMessage`. `ChatService.prepareStream` writes them in `onFinish`. `GET /chat/conversations/:id` returns them. `dbToUIMessage` on the client prefers the persisted parts array for faithful replay.

## Files touched

**API**
- `apps/api/src/modules/chat/gm-agent.ts` (new)
- `apps/api/src/modules/chat/chat.service.ts` (rewire prepareStream)
- `apps/api/src/modules/chat/chat.controller.ts` (abort + parts/reasoning in GET)
- `apps/api/src/modules/chat/system-prompt.ts` (retire FOLLOWUPS delimiter)

**Schema**
- `packages/database/prisma/schema.prisma` (+ `reasoning`, `parts` on ChatMessage)
- `packages/database/prisma/migrations/20260422150000_chat_message_reasoning_parts/migration.sql` (additive)

**Types**
- `packages/types/src/api.ts` (`ChatMessageDto` + `reasoning` + `parts`)

**Web**
- `apps/web/src/app/chat/chat-body.tsx` (`dbToUIMessage` uses persisted parts)
- `apps/web/src/components/chat/chat-message.tsx` (ReasoningBlock + suggest_followups chip suppressed)

## Verification

- `npm exec --workspace=api tsc -- --noEmit` — clean.
- `npm exec --workspace=web tsc -- --noEmit` — clean.
- Migration is additive-only; rolling deploy safe.

## Outstanding / Follow-ups

### Risk / consistency

- [x] **[HIGH] WhatsApp path divergence.** `ChatService.sendMessage` now runs through `buildGmAgent().generate()` with the same `onStepFinish` wiring as the streaming path. Follow-ups come from the `suggest_followups` tool result; the `parseFollowUps` delimiter helper and the raw `Anthropic.messages.create` loop are removed. Image attachments rewrite the last user message into `[TextPart, ImagePart]` for the AI SDK. WhatsApp outbound now sees the same agentic behaviour (adaptive reasoning, sequential tools, structured follow-ups).
- [x] **[MEDIUM] Abort persistence.** `prepareStream`'s `onFinish` short-circuits when `params.abortSignal?.aborted` is true — the partial assistant row is never written. Logs `chat.stream_aborted` for observability instead.
- [x] **[LOW] Legacy replay gap.** `ChatMessageDto` now carries an optional `toolCallLog`. `dbToUIMessage` synthesises `tool-*` UI parts from that log for assistant rows without a `parts` snapshot, so historical tool chips render on replay. `GET /chat/conversations/:id` includes `toolCallLog` in the select.

### Deferred from this pass

- **Proper tool-approval UI for destructive tools** (original item 6). `needsApproval: true` on `save_knowledge_doc` + a client approval widget + `addToolApprovalResponse` wiring. Replaces the prompt-level draft-and-confirm with a real UI confirm.
- **CAPTURE MODE refactor** (original item 5). Currently ~80 lines of prompt. Worth a dedicated capture wizard UI that the chat hands off to, rather than a monolithic prompt section.

### UX gaps

- [x] **Copy + regenerate on assistant messages.** `chat-message.tsx` grew an `AssistantActions` row — thumbs, copy-to-clipboard, and a regenerate button (only shown on the last assistant turn, wired through `chat-thread.tsx → chat-body.tsx → useChat.regenerate()`).
- [x] **Markdown rendering.** `react-markdown` + `remark-gfm` installed; assistant text parts render through a scoped `AssistantMarkdown` component (bold/italic/lists/inline code/links only — no headings, tables, or blockquotes). System prompt rule 6 replaced: "Use markdown lightly" instead of "NO MARKDOWN".
- [x] **Empty-state prompts clickable.** The four example questions are now buttons wired to `submit(text)` via a new `onPick` prop on `EmptyState`.

### Build / deploy gate

- [ ] Apply migration: `npm exec --workspace=api prisma -- migrate deploy`.
- [ ] Restart API dev server so `nest --watch` picks up the `chat.service.ts` import graph change (Anthropic SDK no longer imported in that file).
- [ ] Walk the happy path: new chat → send → see reasoning block + tool chips + follow-up pills + copy/regenerate actions.
- [ ] Walk the capture path: manager asks to save an SOP → draft appears → confirm in reply → save_knowledge_doc fires → loop terminates.
- [ ] Walk the WhatsApp path: inbound text → agent generates → outbound body includes "Quick follow-ups:" footer with up to 3 entries.

## Context for next session

- All 10 original items closed plus every outstanding follow-up (risk/consistency + UX) now resolved. The two items still deferred (tool-approval UI, CAPTURE MODE refactor) are both product-design gated, not mechanical work.
- No in-flight code. Working-tree changes span: `chat.service.ts` (WhatsApp port + abort guard), `system-prompt.ts` (markdown rule swap), `chat-message.tsx` (markdown render + actions), `chat-thread.tsx` / `chat-body.tsx` (regenerate wiring + clickable empty state + legacy parts backfill), `api.ts` (`ChatMessageDto.toolCallLog`), `chat.controller.ts` (select + response mapping). `apps/web/package.json` gains `react-markdown` + `remark-gfm`.
- TypeScript passes on both apps as of this doc edit.
