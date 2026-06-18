import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

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

// Lazy proxy — resolves the real client on first property access, so env vars
// loaded AFTER this module imports (common with tsx + ESM hoisting) still
// reach the PrismaPg adapter.
export const prisma = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function'
      ? (value as (...args: never[]) => unknown).bind(client)
      : value
  },
})

export * from '@prisma/client'
