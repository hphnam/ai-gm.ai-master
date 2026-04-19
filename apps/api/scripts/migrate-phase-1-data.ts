/**
 * Plan 01-01 Task 1 step 7 — one-time backfill for pre-existing v0.1 seed data.
 *
 * The migration itself (20260419160000_auth_orgs/migration.sql) inserts the Demo
 * Organization + backfills Venue.organizationId via `UPDATE WHERE IS NULL`, so
 * this script is effectively a no-op on any DB where the migration has run. It's
 * kept for:
 *   - Explicit audit trail that the backfill ran
 *   - A command-line entry-point devs can run after a squash migration or DB reset
 *
 * Demo User + Account + Membership are created via the sign-up flow in apps/web
 * (better-auth owns its own password hash algorithm; pre-creating User+Account
 * with a non-better-auth hash would break sign-in). The UAT in AC-9 covers the
 * "sign up first with DEMO_USER_EMAIL/PASSWORD, then sign in" flow.
 */

import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(__dirname, '../../../.env') })

import { prisma } from '@gm-ai/database'
import {
  DEMO_ORG_ID,
  DEMO_ORG_NAME,
  DEMO_ORG_SLUG,
  VENUE_CROWN,
  VENUE_ANCHOR,
} from '../src/modules/seed/seed-data'

// audit-added M4: prod-safe guard
const DEFAULT_DEMO_PASSWORD = 'demo-CHANGE-me-before-prod-Xk7t9'

function assertSafe(): void {
  const isProd = process.env.NODE_ENV === 'production'
  const seedDemo = process.env.SEED_DEMO !== 'false'
  const pw = process.env.DEMO_USER_PASSWORD ?? ''

  if (isProd && seedDemo) {
    if (!pw || pw === DEFAULT_DEMO_PASSWORD) {
      console.error(
        '[migrate-phase-1-data] refusing to seed demo in NODE_ENV=production with default/missing DEMO_USER_PASSWORD.',
      )
      process.exit(1)
    }
  }
}

async function main(): Promise<void> {
  assertSafe()
  let orgsCreated = 0
  let venuesAttached = 0

  const existing = await prisma.organization.findUnique({ where: { id: DEMO_ORG_ID } })
  if (existing) {
    console.log(`[migrate-phase-1-data] Demo Organization already exists (${DEMO_ORG_ID}) — idempotent no-op`)
  } else {
    await prisma.organization.create({
      data: { id: DEMO_ORG_ID, name: DEMO_ORG_NAME, slug: DEMO_ORG_SLUG },
    })
    orgsCreated = 1
    console.log(`[migrate-phase-1-data] Demo Organization created`)
  }

  // Idempotent venue attachment — both Crown + Anchor are pinned to DEMO_ORG_ID.
  // If organizationId already matches, updateMany returns 0 affected rows.
  const update = await prisma.venue.updateMany({
    where: { id: { in: [VENUE_CROWN, VENUE_ANCHOR] }, organizationId: { not: DEMO_ORG_ID } },
    data: { organizationId: DEMO_ORG_ID },
  })
  venuesAttached = update.count

  console.log(
    `[migrate-phase-1-data] summary: ${venuesAttached} venues attached, ${orgsCreated} orgs created, 0 errors`,
  )
  console.log(
    `[migrate-phase-1-data] Next: sign up via apps/web at /auth/sign-up with DEMO_USER_EMAIL to claim Demo Organization ownership.`,
  )
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[migrate-phase-1-data] failed:', err)
  process.exit(1)
})
