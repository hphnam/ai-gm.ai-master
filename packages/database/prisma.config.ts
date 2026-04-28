import { config } from 'dotenv'
import { resolve } from 'node:path'
import { defineConfig, env } from 'prisma/config'

// DATABASE_URL lives in apps/api/.env (the API owns the schema).
// In production, the deploy platform injects env vars directly.
config({ path: resolve(__dirname, '../../apps/api/.env'), override: false })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
