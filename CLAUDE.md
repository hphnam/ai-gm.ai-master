# Project Instructions

## Commands

```bash
# Workspace-wide (Turborepo)
npm run dev                                       # all apps
npm run build
npm run lint

# API (apps/api — NestJS + Prisma)
npm run dev --workspace=api                       # nest start --watch
npm run db:migrate --workspace=api                # prisma migrate dev
npm run db:generate --workspace=api               # prisma generate
npm run db:studio --workspace=api
npm run probe:eval --workspace=api                # 12-query retrieval harness
npm run probe:section --workspace=api             # 27-query schema + retrieval probe

# Web (apps/web — Next.js)
npm run dev --workspace=web                       # next dev --port 3000
npm run api:generate --workspace=web              # orval — regenerate API client

# Tests (node built-in runner)
node --import tsx --test path/to/file.spec.ts
```

## Architecture

- Monorepo: `apps/api` (NestJS) and `apps/web` (Next.js App Router). npm workspaces + Turborepo.
- API modules are feature-based under `apps/api/src/modules/<domain>`. One module per domain (auth, chat, chat-starters, compliance, embeddings, indexer, notifications, tasks, whatsapp, etc.).
- Knowledge pipeline: Reducto extracts documents → Voyage embeds (`voyage-3.5`) and reranks (`rerank-2`) → stored in Postgres via Prisma.
- WhatsApp integration via Twilio Conversations API. Webhook at `/webhooks/twilio/conversations` (urlencoded, X-Twilio-Signature HMAC-SHA1). New users onboard via signed-link DM; existing users link a phone with a web-entered confirmation code.
- Realtime via Socket.io with Redis adapter; background jobs via BullMQ. Per-user events (`task.upserted`, `notification.created/updated/reply.created`) fan out to private user rooms; org-scoped events (`doc.updated`, `gap.updated`, `expiry.upserted`, `whatsapp.invite.updated`) fan out to the org room.
- Notes (in-app notifications) support flat reply threads — `GET/POST /notifications/:id/replies`, scoped to the original recipient + author. System-authored notes (compliance reminders) are read-only. Wave 4 role gate on `POST /tasks`: staff = self-only, manager + owner = anyone.

## Key Decisions

- Auth: better-auth with multi-org support. Org membership gates knowledge access.
- Phone verification uses WhatsApp OTP (not SMS) — see `apps/api/src/modules/phone`.
- Embeddings stay on Voyage (not OpenAI). Don't swap without re-embedding the corpus.
- Probes (`probe:eval`, `probe:section`) are the quality gate after any retrieval/embedding change.
- Background queues: `nudges` (stock cutoff pings, `NUDGE_CRON_DISABLED=1` to skip), `task-reminders` (Wave 1 reminders, `TASK_REMINDER_CRON_DISABLED=1` to skip), `expiry-scheduler` (Wave 2 compliance reminders at 30/7/1/overdue windows, `EXPIRY_SCHEDULER_DISABLED=1` to skip), and `chat-starters` (Wave 3 weekly per-venue rotating /chat landing prompts, `CHAT_STARTERS_CRON_DISABLED=1` to skip the cron; `CHAT_STARTERS_GENERATOR_DISABLED=1` to skip the Haiku call without disabling the cron). The Wave 2 expiry extractor runs on each upload via the ingest pipeline — set `EXPIRY_EXTRACTOR_DISABLED=1` to skip the classifier call. All BullMQ jobs register on `onApplicationBootstrap` in their processors.
- Direct Redis cache: Wave 3 `chat-starters` writes a per-venue payload to `chat:starters:<orgId>:<venueId>` with a 14-day TTL via a dedicated ioredis client on `REDIS_URL` (separate from BullMQ job state and Socket.IO adapter). Flush by `DEL` on that key pattern; absent keys fall back to a generic prompt list inline.
- Third-party integrations (Square today; more later): generic `Integration` model holds encrypted per-org credentials. Encryption is AES-256-GCM with a per-record random salt + IV and HKDF-derived encryption key; ciphertext is version-tagged on disk (`v1:<base64>`) so future key/cipher rotations are non-breaking. The master key comes from `INTEGRATION_TOKEN_KEY` and MUST be prefixed `hex:` (64 hex chars) or `base64:` (44 base64 chars decoding to 32 bytes) — raw passphrases are rejected at boot. Generate one with `openssl rand -hex 32`. Providers self-register tools at `onModuleInit` against `IntegrationRegistry`; multiple providers may claim the same tool name (capability) and dispatch routes per-org via `Integration.provider`. Each provider declares a `domain` (`pos | accounting | crm | other`) and the connect endpoint refuses a second provider in the same domain for the same org. `validateCredentials` on a provider pings the vendor at connect-time so bad PATs are rejected before persistence. `ToolDispatcher` falls through to the registry on built-in tool miss, and `buildAiSdkTools` concatenates provider tool definitions onto `TOOL_DEFINITIONS`. New integrations: drop a module under `apps/api/src/modules/integrations/<provider>/`, implement `IntegrationProvider`, `register()` against the registry — no edits to `chat-tools.ts`. Venues map to a POS location via `Venue.squareLocationId`. Connect endpoint: `POST /integrations/:provider/connect-pat` (manager-only, rate-limited 10/15min/org); OAuth not yet wired but schema is OAuth-shaped (`authMode`, `refreshTokenCipher`, `tokenExpiresAt`). Per-tool per-org rate limit: 30/min.

## Review Gate

Before declaring any code-edit task complete in `apps/api/src/` or `apps/web/src/`, spawn `code-reviewer` and `security-reviewer` (parallel — one message with multiple Agent tool blocks). For doc or API-contract changes, also spawn `doc-reviewer`. Surface every HIGH/MEDIUM finding before closing the work.

Skip only for: pure doc edits, formatting-only changes, dependency bumps with no code impact, single-line config knob changes.

## Don'ts

- Never modify existing Prisma migrations under `apps/api/prisma/migrations/`. Add a new one.
- Don't edit `apps/web/src/generated/**` (orval-generated API client).
- `docs/` xlsx files are runtime canaries for the document-intelligence pipeline, not dev seed data.
