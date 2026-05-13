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
- API modules are feature-based under `apps/api/src/modules/<domain>`. One module per domain (auth, chat, embeddings, indexer, whatsapp, etc.).
- Knowledge pipeline: Reducto extracts documents → Voyage embeds (`voyage-3.5`) and reranks (`rerank-2`) → stored in Postgres via Prisma.
- WhatsApp integration via Twilio Conversations API. Webhook at `/webhooks/twilio/conversations` (urlencoded, X-Twilio-Signature HMAC-SHA1). New users onboard via signed-link DM; existing users link a phone with a web-entered confirmation code.
- Realtime via Socket.io with Redis adapter; background jobs via BullMQ.

## Key Decisions

- Auth: better-auth with multi-org support. Org membership gates knowledge access.
- Phone verification uses WhatsApp OTP (not SMS) — see `apps/api/src/modules/phone`.
- Embeddings stay on Voyage (not OpenAI). Don't swap without re-embedding the corpus.
- Probes (`probe:eval`, `probe:section`) are the quality gate after any retrieval/embedding change.

## Review Gate

Before declaring any code-edit task complete in `apps/api/src/` or `apps/web/src/`, spawn `code-reviewer` and `security-reviewer` (parallel — one message with multiple Agent tool blocks). For doc or API-contract changes, also spawn `doc-reviewer`. Surface every HIGH/MEDIUM finding before closing the work.

Skip only for: pure doc edits, formatting-only changes, dependency bumps with no code impact, single-line config knob changes.

## Don'ts

- Never modify existing Prisma migrations under `apps/api/prisma/migrations/`. Add a new one.
- Don't edit `apps/web/src/generated/**` (orval-generated API client).
- `docs/` xlsx files are runtime canaries for the document-intelligence pipeline, not dev seed data.
