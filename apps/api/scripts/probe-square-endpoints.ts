/**
 * One-shot probe: exercise the Square endpoints flagged as failing in the
 * integration review — vendors.search (400?), bookings.list (credential
 * error?), devices.list (empty?), plus a weekly tender-count sanity check.
 * Read-only against the live Beer Hall account — no writes, no migrate.
 *
 *   npx tsx apps/api/scripts/probe-square-endpoints.ts
 */

import '../src/load-env'
import { prisma } from '../src/database/prisma'
import { decryptToken } from '../src/modules/integrations/crypto'
import { getSquareClient } from '../src/modules/integrations/square/square-client'

const ELLIOT_EMAIL = 'elliot@lunebrew.com'

function describeError(err: unknown): string {
  const e = err as {
    statusCode?: number
    message?: string
    body?: { errors?: Array<{ category?: string; code?: string; detail?: string; field?: string }> }
  }
  const errors = e?.body?.errors ?? []
  const parts = errors.map(
    (x) =>
      `${x.category ?? '?'}/${x.code ?? '?'}${x.field ? ` field=${x.field}` : ''} — ${x.detail ?? ''}`,
  )
  return `status=${e?.statusCode ?? '?'} ${parts.length ? parts.join(' | ') : (e?.message ?? String(err))}`
}

async function main(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: ELLIOT_EMAIL },
    select: { id: true },
  })
  if (!user) return console.log(`no user ${ELLIOT_EMAIL}`)
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })
  if (!membership) return console.log('no org membership')
  const orgId = membership.organizationId

  const integration = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId: orgId, provider: 'square' } },
    select: { accessTokenCipher: true, environment: true, status: true, externalAccountId: true },
  })
  if (!integration || integration.status !== 'active') {
    return console.log(`square integration status=${integration?.status ?? 'none'}`)
  }
  const venues = await prisma.venue.findMany({
    where: { organizationId: orgId },
    select: { name: true, squareLocationId: true },
  })
  console.log(
    `org=${orgId} env=${integration.environment} merchant=${integration.externalAccountId}`,
  )
  console.log(
    'mapped venues:',
    venues.map((v) => `${v.name}→${v.squareLocationId ?? '(none)'}`).join('  '),
  )
  const locationId = venues.find((v) => v.squareLocationId)?.squareLocationId
  if (!locationId) return console.log('no venue has a squareLocationId — aborting')

  const client = getSquareClient({
    orgId,
    accessToken: decryptToken(integration.accessTokenCipher),
    environment: integration.environment,
  })

  // 1) vendors.search — reported 400 ----------------------------------------
  console.log('\n=== 1. vendors.search ===')
  try {
    const resp = await client.vendors.search({})
    const vendors = ((resp as { vendors?: unknown[] }).vendors ?? []) as Array<
      Record<string, unknown>
    >
    console.log(`  no-filter: OK, ${vendors.length} vendors`)
    for (const v of vendors.slice(0, 10))
      console.log(`    ${v.id}  "${v.name}"  status=${v.status}`)
  } catch (err) {
    console.log(`  no-filter FAILED: ${describeError(err)}`)
  }
  try {
    const resp = await client.vendors.search({ filter: { status: ['ACTIVE'] } })
    const vendors = ((resp as { vendors?: unknown[] }).vendors ?? []) as unknown[]
    console.log(`  status=ACTIVE filter: OK, ${vendors.length} vendors`)
  } catch (err) {
    console.log(`  status=ACTIVE filter FAILED: ${describeError(err)}`)
  }

  // 2) bookings.list — reported credential rejection -------------------------
  console.log('\n=== 2. bookings.list ===')
  try {
    const page = await client.bookings.list({
      locationId,
      startAtMin: new Date().toISOString(),
      startAtMax: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    })
    let n = 0
    for await (const b of page) {
      n += 1
      if (n <= 5) {
        const r = b as Record<string, unknown>
        console.log(`    ${r.id}  startAt=${r.startAt}  status=${r.status}`)
      }
      if (n >= 50) break
    }
    console.log(`  OK, ${n} bookings in next 14 days at ${locationId}`)
  } catch (err) {
    console.log(`  FAILED: ${describeError(err)}`)
  }

  // 3) devices.list — reported empty ------------------------------------------
  console.log('\n=== 3. devices.list ===')
  for (const loc of [locationId, undefined]) {
    try {
      const page = await client.devices.list({ ...(loc ? { locationId: loc } : {}) })
      const rows: Array<Record<string, unknown>> = []
      for await (const d of page as AsyncIterable<unknown>) {
        rows.push(d as Record<string, unknown>)
        if (rows.length >= 50) break
      }
      console.log(`  ${loc ? `locationId=${loc}` : 'no filter (all)'}: ${rows.length} devices`)
      for (const d of rows.slice(0, 10)) {
        const attrs = d.attributes as Record<string, unknown> | undefined
        console.log(
          `    ${d.id}  name=${attrs?.name ?? '?'}  type=${attrs?.type ?? '?'}  status=${JSON.stringify((d.status as Record<string, unknown>)?.category ?? d.status ?? '?')}`,
        )
      }
    } catch (err) {
      console.log(`  ${loc ? `locationId=${loc}` : 'no filter'} FAILED: ${describeError(err)}`)
    }
  }
  try {
    const page = await client.devices.codes.list({})
    const rows: Array<Record<string, unknown>> = []
    for await (const c of page as AsyncIterable<unknown>) {
      rows.push(c as Record<string, unknown>)
      if (rows.length >= 50) break
    }
    console.log(`  device codes (pairings): ${rows.length}`)
    for (const c of rows.slice(0, 10)) {
      console.log(
        `    ${c.id}  name=${c.name}  location=${c.locationId}  status=${c.status}  paired deviceId=${c.deviceId ?? '(unpaired)'}`,
      )
    }
  } catch (err) {
    console.log(`  device codes FAILED: ${describeError(err)}`)
  }

  // 3b) payouts.list — same optional-enum SDK pattern as devices -------------
  console.log('\n=== 3b. payouts.list ===')
  const begin = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const end = new Date().toISOString()
  try {
    const page = await client.payouts.list({ locationId, beginTime: begin, endTime: end })
    let n = 0
    for await (const _ of page as AsyncIterable<unknown>) {
      n += 1
      if (n >= 100) break
    }
    console.log(`  app path (no status/sortOrder): OK, ${n} payouts in 30d`)
  } catch (err) {
    console.log(`  app path (no status/sortOrder) FAILED: ${describeError(err)}`)
  }
  try {
    const page = await client.payouts.list({
      locationId,
      beginTime: begin,
      endTime: end,
      status: 'PAID',
      sortOrder: 'DESC',
    })
    let n = 0
    for await (const _ of page as AsyncIterable<unknown>) {
      n += 1
      if (n >= 100) break
    }
    console.log(`  explicit status+sortOrder: OK, ${n} PAID payouts in 30d`)
  } catch (err) {
    console.log(`  explicit status+sortOrder FAILED: ${describeError(err)}`)
  }

  // 4) weekly tender sanity: orders.search count vs payments.list count ------
  console.log('\n=== 4. weekly window: orders vs payments count ===')
  const startAt = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const endAt = new Date().toISOString()
  let orderCount = 0
  let tenderCount = 0
  let cursor: string | undefined
  try {
    for (let i = 0; i < 10; i++) {
      const resp = await client.orders.search({
        locationIds: [locationId],
        limit: 500,
        ...(cursor ? { cursor } : {}),
        query: {
          filter: {
            dateTimeFilter: { createdAt: { startAt, endAt } },
            stateFilter: { states: ['COMPLETED'] },
          },
        },
      })
      const orders = ((resp as { orders?: unknown[] }).orders ?? []) as Array<
        Record<string, unknown>
      >
      orderCount += orders.length
      for (const o of orders) tenderCount += ((o.tenders ?? []) as unknown[]).length
      cursor = (resp as { cursor?: string }).cursor
      if (!cursor || orders.length === 0) break
    }
    console.log(
      `  orders.search (fix path): ${orderCount} completed orders, ${tenderCount} tenders`,
    )
  } catch (err) {
    console.log(`  orders.search FAILED: ${describeError(err)}`)
  }
  try {
    const page = await client.payments.list({ locationId, beginTime: startAt, endTime: endAt })
    let n = 0
    for await (const _ of page as AsyncIterable<unknown>) {
      n += 1
      if (n >= 5000) break
    }
    console.log(`  payments.list (old buggy path): ${n} payments`)
  } catch (err) {
    console.log(`  payments.list FAILED: ${describeError(err)}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
