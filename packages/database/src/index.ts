import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — add it to .env at repo root before using prisma')
  }
  const adapter = new PrismaPg({ connectionString })
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
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})

export * from '@prisma/client'
