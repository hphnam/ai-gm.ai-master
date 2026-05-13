import { resolve } from 'node:path'
import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Run from apps/api/. DATABASE_URL lives in the local .env in dev;
// in production the deploy platform injects env vars directly.
config({ path: resolve(__dirname, '.env'), override: false })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
