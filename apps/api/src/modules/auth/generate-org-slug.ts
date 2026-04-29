import { prisma } from '../../database/prisma'

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SUFFIX_LEN = 6
const MAX_RETRIES = 5

export class OrgSlugConflictError extends Error {
  constructor(base: string) {
    super(`failed to generate unique org slug from base "${base}" after ${MAX_RETRIES} retries`)
    this.name = 'OrgSlugConflictError'
  }
}

function shortId(len = SUFFIX_LEN): string {
  let out = ''
  for (let i = 0; i < len; i++) {
    out += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)]
  }
  return out
}

function baseSlug(input: string): string {
  const lowered = (input ?? '').toLowerCase().trim()
  const collapsed = lowered
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (collapsed.length < 3) return `org-${shortId(8)}`
  return collapsed.slice(0, 72)
}

export async function generateOrgSlug(input: string): Promise<string> {
  const base = baseSlug(input)

  const bare = await prisma.organization.findUnique({ where: { slug: base }, select: { id: true } })
  if (!bare) return base

  for (let i = 0; i < MAX_RETRIES; i++) {
    const candidate = `${base}-${shortId()}`.slice(0, 80)
    const hit = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!hit) return candidate
  }
  throw new OrgSlugConflictError(base)
}
