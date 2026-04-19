import '../load-env'

import { NestFactory } from '@nestjs/core'
import { prisma } from '@gm-ai/database'
import { TOOL_NAMES, type ProactiveSuggestion } from '@gm-ai/types'
import { AppModule } from '../app.module'
import { SuggestionsService } from '../modules/suggestions/suggestions.service'
import { DEMO_ORG_ID, VENUE_ANCHOR, VENUE_CROWN } from '../modules/seed/seed-data'

type ProbeResult = { name: string; ok: boolean; detail?: string }

async function runProbe(): Promise<{ ok: boolean }> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    abortOnError: false,
    logger: false,
  })
  const suggestions = app.get(SuggestionsService)

  const checks: ProbeResult[] = []
  let otherVenueConvId: string | null = null

  try {
    const anchorConv = await prisma.chatConversation.create({
      data: { venueId: VENUE_ANCHOR },
    })
    otherVenueConvId = anchorConv.id

    const baselineConvs = await prisma.chatConversation.count()
    const baselineMsgs = await prisma.chatMessage.count()

    const open = await suggestions.onConversationOpen(VENUE_CROWN, DEMO_ORG_ID)

    checks.push({
      name: '1. onConversationOpen(CROWN) returns >=1 below-par suggestion',
      ok: open.filter((s) => s.kind === 'below-par').length >= 1,
      detail: `${open.filter((s) => s.kind === 'below-par').length} below-par`,
    })
    checks.push({
      name: '2. onConversationOpen(CROWN) returns >=1 cutoff suggestion',
      ok: open.filter((s) => s.kind === 'cutoff').length >= 1,
      detail: `${open.filter((s) => s.kind === 'cutoff').length} cutoff`,
    })
    const toolNames = new Set<string>(TOOL_NAMES)
    checks.push({
      name: '3. every suggestion has sourceToolCall.tool in TOOL_NAMES',
      ok: open.every((s) => toolNames.has(s.sourceToolCall.tool)),
      detail: `${open.length} checked`,
    })
    const kinds = new Set(['below-par', 'cutoff'])
    checks.push({
      name: '4. every suggestion has kind in (below-par | cutoff)',
      ok: open.every((s) => kinds.has(s.kind)),
      detail: `${open.length} checked`,
    })

    const unknownVenue = await suggestions.onConversationOpen(
      '00000000-0000-0000-0000-000000000000',
      DEMO_ORG_ID,
    )
    checks.push({
      name: '5. onConversationOpen(unknown UUID) returns []',
      ok: unknownVenue.length === 0,
      detail: `${unknownVenue.length} returned`,
    })

    const malformed = await suggestions.onConversationOpen('not-a-uuid', DEMO_ORG_ID)
    checks.push({
      name: '6. onConversationOpen(malformed) returns [] (fail-soft)',
      ok: malformed.length === 0,
      detail: `${malformed.length} returned`,
    })

    const noGate = await suggestions.onTurn(VENUE_CROWN, "what's the weather", DEMO_ORG_ID)
    checks.push({
      name: '7. onTurn(weather) returns [] (no heuristic match)',
      ok: noGate.length === 0,
      detail: `${noGate.length} returned`,
    })

    const stockGate = await suggestions.onTurn(VENUE_CROWN, 'any beer running low?', DEMO_ORG_ID)
    checks.push({
      name: '8. onTurn(running low) returns >=1 below-par suggestion with itemIds',
      ok:
        stockGate.some((s) => s.kind === 'below-par' && s.itemIds.length > 0) &&
        stockGate.length >= 1,
      detail: `${stockGate.length} returned`,
    })

    const warnCount = open.filter((s) => s.severity === 'warn').length
    checks.push({
      name: '9. onConversationOpen(CROWN) returns >=1 suggestion with severity=warn',
      ok: warnCount >= 1,
      detail: `${warnCount} warn (seed: Neck Oil IPA currentQty=0)`,
    })

    const bothGates = await suggestions.onTurn(
      VENUE_CROWN,
      'need to place an order — what stock is below par?',
      DEMO_ORG_ID,
    )
    const dedupeKeys = new Set(
      bothGates.map((s) => `${s.kind}|${s.itemIds[0] ?? s.sourceToolCall.tool}`),
    )
    checks.push({
      name: '10. onTurn(both gates) produces no duplicate (kind, itemIds[0]) entries',
      ok: dedupeKeys.size === bothGates.length && bothGates.length >= 2,
      detail: `${bothGates.length} returned, ${dedupeKeys.size} unique keys`,
    })

    const crossTenant = await suggestions.onTurn(
      VENUE_CROWN,
      'any beer running low?',
      DEMO_ORG_ID,
      otherVenueConvId,
    )
    checks.push({
      name: '11. onTurn(CROWN, …, anchor-conversationId) returns [] (cross-tenant preflight)',
      ok: crossTenant.length === 0,
      detail: `${crossTenant.length} returned`,
    })

    const generatedAtSet = new Set(open.map((s) => s.generatedAt))
    checks.push({
      name: '  • generatedAt invariant: single-call batch shares one ISO timestamp',
      ok: generatedAtSet.size === 1,
      detail: `${generatedAtSet.size} distinct timestamps across ${open.length} suggestions`,
    })

    const postConvs = await prisma.chatConversation.count()
    const postMsgs = await prisma.chatMessage.count()
    checks.push({
      name: '  • non-persistence: chat_conversations count unchanged',
      ok: postConvs === baselineConvs,
      detail: `baseline=${baselineConvs} post=${postConvs}`,
    })
    checks.push({
      name: '  • non-persistence: chat_messages count unchanged',
      ok: postMsgs === baselineMsgs,
      detail: `baseline=${baselineMsgs} post=${postMsgs}`,
    })
  } finally {
    if (otherVenueConvId) {
      await prisma.chatConversation
        .delete({ where: { id: otherVenueConvId } })
        .catch(() => {})
    }
    await app.close()
  }

  const passed = checks.filter((c) => c.ok).length
  const total = checks.length
  for (const c of checks) {
    console.log(`${c.ok ? '\u2713' : '\u2717'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  }
  console.log(`\n[probe-suggestions] ${passed}/${total} passed`)
  return { ok: passed === total }
}

async function main() {
  let ok = false
  try {
    const res = await runProbe()
    ok = res.ok
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
  if (!ok) process.exit(1)
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
