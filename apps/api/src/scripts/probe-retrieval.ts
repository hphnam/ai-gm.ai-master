import '../load-env'

import { NestFactory } from '@nestjs/core'
import { prisma } from '@gm-ai/database'
import { RetrievalModule } from '../modules/retrieval/retrieval.module'
import { RetrievalService } from '../modules/retrieval/retrieval.service'
import { MockOpsService } from '../modules/mock-ops/mock-ops.service'

const VENUE_CROWN = 'a1000000-0000-0000-0000-000000000001'

async function runProbe(): Promise<boolean> {
  const app = await NestFactory.createApplicationContext(RetrievalModule, { logger: false })
  const retrieval = app.get(RetrievalService)
  const mockOps = app.get(MockOpsService)

  const checks: Array<{ name: string; ok: boolean; detail?: string }> = []

  // 1. Retrieval hit
  const hitResult = await retrieval.find('ice machine not making ice', { limit: 3 })
  if (hitResult.ok) {
    const top = hitResult.data[0]
    const contentMatches = /ice machine/i.test(top.content)
    checks.push({
      name: 'retrieval hit: "ice machine" finds Ice Machine SOP',
      ok: contentMatches,
      detail: `topSim=${top.similarity.toFixed(3)}, id=${top.id}`,
    })
  } else {
    checks.push({
      name: 'retrieval hit: "ice machine"',
      ok: false,
      detail: hitResult.detail,
    })
  }

  // 2. Retrieval no-data
  const missResult = await retrieval.find('zzzzz quantum dolphin polka prognostication', {
    limit: 3,
  })
  checks.push({
    name: 'retrieval no-data: gibberish query returns ok:false',
    ok: !missResult.ok && missResult.reason === 'no-data',
    detail: missResult.ok ? 'unexpectedly matched' : missResult.detail,
  })

  // 3. getStockBelowPar — deterministic: fixture has 11 Crown below-par items
  const belowPar = await mockOps.getStockBelowPar(VENUE_CROWN)
  checks.push({
    name: 'getStockBelowPar: finds >=5 below-par items (fixture)',
    ok: belowPar.ok && belowPar.data.length >= 5,
    detail: belowPar.ok
      ? `${belowPar.data.length} items; top: ${belowPar.data[0]?.name}`
      : `unexpected ${belowPar.reason}`,
  })

  // 4. getStockByName: hit
  const stockHit = await mockOps.getStockByName(VENUE_CROWN, 'lager')
  checks.push({
    name: 'getStockByName("lager"): returns lager rows',
    ok:
      stockHit.ok &&
      stockHit.data.length >= 1 &&
      stockHit.data.every((r) => /lager/i.test(r.name)),
    detail: stockHit.ok ? `${stockHit.data.length} rows` : stockHit.detail,
  })

  // 5. getStockByName: no-data
  const stockMiss = await mockOps.getStockByName(VENUE_CROWN, 'zzznoSuchItem')
  checks.push({
    name: 'getStockByName no-data: nonsense returns ok:false',
    ok: !stockMiss.ok && stockMiss.reason === 'no-data',
    detail: stockMiss.ok ? 'unexpectedly matched' : stockMiss.detail,
  })

  // 6. getSupplierByName
  const supplier = await mockOps.getSupplierByName('Matthew')
  checks.push({
    name: 'getSupplierByName("Matthew"): finds Matthew Clark',
    ok:
      supplier.ok &&
      supplier.data.length >= 1 &&
      /matthew/i.test(supplier.data[0].name),
    detail: supplier.ok ? supplier.data[0].name : supplier.detail,
  })

  // 7. getUpcomingCutoffs
  const cutoffs = await mockOps.getUpcomingCutoffs(VENUE_CROWN, 72)
  checks.push({
    name: 'getUpcomingCutoffs(72h): returns suppliers within window',
    ok:
      cutoffs.ok &&
      cutoffs.data.length >= 1 &&
      cutoffs.data.every((r) => r.estimatedDeliveryHours <= 72),
    detail: cutoffs.ok ? `${cutoffs.data.length} suppliers` : cutoffs.detail,
  })

  // 8. Retrieval venueId-scoped (audit-added)
  const venueScoped = await retrieval.find('ice machine not making ice', {
    venueId: VENUE_CROWN,
    limit: 3,
  })
  checks.push({
    name: 'retrieval venueId-scoped: "ice machine" for VENUE_CROWN returns hits',
    ok: venueScoped.ok && venueScoped.data.length >= 1,
    detail: venueScoped.ok ? `${venueScoped.data.length} hits` : venueScoped.detail,
  })

  // 9. Invalid venueId fail-fast (audit-added)
  const badVenue = await retrieval.find('ice machine', { venueId: 'not-a-uuid' })
  checks.push({
    name: 'retrieval invalid venueId: returns ok:false, reason:error',
    ok: !badVenue.ok && badVenue.reason === 'error',
    detail: badVenue.ok ? 'unexpectedly succeeded' : badVenue.detail,
  })

  let failed = 0
  for (const c of checks) {
    console.log(`${c.ok ? '\u2713' : '\u2717'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
    if (!c.ok) failed++
  }

  await app.close()
  return failed === 0
}

async function main() {
  let ok = false
  try {
    ok = await runProbe()
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
  if (!ok) {
    console.error('\nRetrieval probe FAILED')
    process.exit(1)
  }
  console.log('\nRetrieval probe passed')
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
