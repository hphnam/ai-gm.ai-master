/**
 * One-shot probe: dump the REAL catalog for the Beer Hall Square account —
 * locations, full ITEM_VARIATION cost coverage, and raw variation objects so we
 * can see exactly which fields Square returns. Read-only — no writes, no migrate.
 *
 *   npx tsx apps/api/scripts/probe-square-cost.ts
 */

import '../src/load-env'
import { prisma } from '../src/database/prisma'
import { decryptToken } from '../src/modules/integrations/crypto'
import { getSquareClient } from '../src/modules/integrations/square/square-client'
import { readVariationCost } from '../src/modules/integrations/square/square-cogs.service'

const ELLIOT_EMAIL = 'elliot@lunebrew.com'

function moneyStr(m: { amount?: bigint | number; currency?: string } | undefined): string {
  if (m?.amount == null) return '—'
  return `${Number(m.amount)} ${m.currency ?? '?'}`
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

  const client = getSquareClient({
    orgId,
    accessToken: decryptToken(integration.accessTokenCipher),
    environment: integration.environment,
  })

  // 0) Locations in this Square account ------------------------------------
  console.log('\n=== 0. Locations in this Square account ===')
  const locs = await client.locations.list()
  const locArr = ((locs as { locations?: unknown[] }).locations ?? []) as Array<
    Record<string, unknown>
  >
  for (const l of locArr) {
    console.log(`  ${l.id}  "${l.name}"  status=${l.status}`)
  }

  // 1) Full ITEM_VARIATION cost coverage (no 500 cap) ----------------------
  console.log('\n=== 1. Full ITEM_VARIATION cost coverage ===')
  const list = await client.catalog.list({ types: 'ITEM_VARIATION' })
  let total = 0
  let withDefault = 0
  let withVendor = 0
  let withPrice = 0
  const fieldKeys = new Set<string>()
  const costedSamples: string[] = []
  for await (const obj of list) {
    if ((obj as Record<string, unknown>).type !== 'ITEM_VARIATION') continue
    total += 1
    const data = ((obj as Record<string, unknown>).itemVariationData ?? {}) as Record<
      string,
      unknown
    >
    Object.keys(data).forEach((k) => fieldKeys.add(k))
    const def = (data.defaultUnitCost ?? data.default_unit_cost) as
      | { amount?: number; currency?: string }
      | undefined
    const vendorInfos = (data.itemVariationVendorInfos ?? data.item_variation_vendor_infos) as
      | Array<{
          itemVariationVendorInfoData?: { priceMoney?: { amount?: number } }
          item_variation_vendor_info_data?: { price_money?: { amount?: number } }
        }>
      | undefined
    const vendor = vendorInfos?.find(
      (v) =>
        v.itemVariationVendorInfoData?.priceMoney?.amount != null ||
        v.item_variation_vendor_info_data?.price_money?.amount != null,
    )
    if (data.priceMoney) withPrice += 1
    if (def?.amount != null) withDefault += 1
    if (vendor) withVendor += 1
    if (costedSamples.length < 10 && (def?.amount != null || vendor)) {
      costedSamples.push(
        `  ${(obj as { id?: string }).id} "${data.name ?? '?'}" cost=${moneyStr(def)} vendor=${moneyStr(vendor?.itemVariationVendorInfoData?.priceMoney)}`,
      )
    }
  }
  console.log(`total ITEM_VARIATIONs=${total}`)
  console.log(
    `  withPriceMoney=${withPrice}  withDefaultUnitCost=${withDefault}  withVendorCost=${withVendor}`,
  )
  console.log(`  defaultUnitCost coverage=${total ? ((withDefault / total) * 100).toFixed(1) : 0}%`)
  console.log(`\n  distinct itemVariationData keys seen across all variations:`)
  console.log(`  ${Array.from(fieldKeys).sort().join(', ')}`)
  if (costedSamples.length) {
    console.log('\n  costed samples:')
    costedSamples.forEach((s) => console.log(s))
  } else {
    console.log('\n  (no variation carries any cost field)')
  }

  // 1b) End-to-end COGS for yesterday using the REAL readVariationCost ------
  console.log('\n=== 1b. Yesterday COGS via the shipped readVariationCost ===')
  const venue = venues.find((v) => v.squareLocationId)
  if (venue?.squareLocationId) {
    const now = new Date()
    const startAt = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()
    const ordResp = await client.orders.search({
      locationIds: [venue.squareLocationId],
      limit: 500,
      query: {
        filter: {
          dateTimeFilter: { createdAt: { startAt, endAt: now.toISOString() } },
          stateFilter: { states: ['COMPLETED'] },
        },
      },
    })
    const orders = ((ordResp as { orders?: unknown[] }).orders ?? []) as Array<
      Record<string, unknown>
    >
    const qtyByVar = new Map<string, number>()
    let grossMinor = 0
    for (const o of orders) {
      const tot = o.totalMoney as { amount?: number } | undefined
      if (tot?.amount != null) grossMinor += Number(tot.amount)
      for (const li of (o.lineItems ?? []) as Array<Record<string, unknown>>) {
        const id = typeof li.catalogObjectId === 'string' ? li.catalogObjectId : ''
        const q = Number(li.quantity ?? 0)
        if (id && Number.isFinite(q)) qtyByVar.set(id, (qtyByVar.get(id) ?? 0) + q)
      }
    }
    const ids = Array.from(qtyByVar.keys())
    const costByVar = new Map<string, number>()
    for (let i = 0; i < ids.length; i += 1000) {
      const got = await client.catalog.batchGet({ objectIds: ids.slice(i, i + 1000) })
      for (const obj of ((got as { objects?: unknown[] }).objects ?? []) as Array<
        Record<string, unknown>
      >) {
        if (obj.type !== 'ITEM_VARIATION') continue
        const id = typeof obj.id === 'string' ? obj.id : ''
        const money = readVariationCost((obj.itemVariationData ?? {}) as Record<string, unknown>)
        if (id && money?.amount != null) costByVar.set(id, Number(money.amount))
      }
    }
    let cogsMinor = 0
    let costedLines = 0
    for (const [id, qty] of qtyByVar) {
      const unit = costByVar.get(id)
      if (unit != null) {
        cogsMinor += unit * qty
        costedLines += 1
      }
    }
    const coverage = qtyByVar.size ? (costedLines / qtyByVar.size) * 100 : 0
    const gp = grossMinor > 0 ? ((grossMinor - cogsMinor) / grossMinor) * 100 : 0
    console.log(
      `  orders=${orders.length} soldVariations=${qtyByVar.size} costedLines=${costedLines} coverage=${coverage.toFixed(0)}%`,
    )
    console.log(
      `  grossSales=£${(grossMinor / 100).toFixed(2)}  COGS=£${(cogsMinor / 100).toFixed(2)}  grossMargin=${gp.toFixed(1)}%`,
    )
  }

  // 2) Raw dump of 2 variations so we see EXACTLY what Square returns -------
  console.log('\n=== 2. Raw variation objects (first 2) ===')
  const list2 = await client.catalog.list({ types: 'ITEM_VARIATION' })
  let dumped = 0
  for await (const obj of list2) {
    if ((obj as Record<string, unknown>).type !== 'ITEM_VARIATION') continue
    console.log(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? Number(v) : v), 2))
    if (++dumped >= 2) break
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
