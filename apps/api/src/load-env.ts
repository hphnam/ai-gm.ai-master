import { resolve } from 'node:path'
import { config } from 'dotenv'

// Load apps/api/.env relative to this file. In dev (tsx/swc) this file lives at
// apps/api/src/load-env.ts; in prod (compiled) at apps/api/dist/src/load-env.js.
// Try both candidate locations; whichever resolves to apps/api/.env wins.
// Production deploys should rely on platform-injected env vars — these calls
// are best-effort and silently no-op when no .env file is present.
const candidates = [
  resolve(__dirname, '../.env'), // dev:  apps/api/src/  → apps/api/.env
  resolve(__dirname, '../../.env'), // prod: apps/api/dist/src/ → apps/api/.env
]

for (const path of candidates) {
  config({ path, override: false })
}
