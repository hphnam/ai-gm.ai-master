import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { resolveClientForRequest } from './venue-context'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('DATABASE_URL is not set — add it to apps/api/.env before using prisma')
  }
  // Strip `sslmode` from the URL and pass `ssl` explicitly. pg-connection-string's
  // sslmode aliasing (require/prefer/verify-ca → verify-full) emits a deprecation
  // warning in pg v8.x ahead of a v9.0 semantics change. Setting ssl directly on
  // the adapter bypasses the aliasing entirely.
  const url = new URL(raw)
  const sslmode = url.searchParams.get('sslmode')
  url.searchParams.delete('sslmode')
  const adapter = new PrismaPg({
    connectionString: url.toString(),
    ssl: sslmode && sslmode !== 'disable' ? { rejectUnauthorized: true } : false,
  })
  return new PrismaClient({ adapter })
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient()
  return globalForPrisma.prisma
}

// Lazy proxy — resolves the real client on first property access (so env vars
// loaded AFTER this module imports still reach the adapter) AND swaps in the
// per-request venue-scoped client when the caller is a venue-scoped member. The
// resolution happens INSIDE the request's ALS context, so the scope is visible
// here even though it isn't inside Prisma's own extension hook.
export const prisma = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const client = resolveClientForRequest(getClient())
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function'
      ? (value as (...args: never[]) => unknown).bind(client)
      : value
  },
})

export * from '@prisma/client'
