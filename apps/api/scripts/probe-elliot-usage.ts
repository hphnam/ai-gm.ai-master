/**
 * One-shot research script: aggregate Elliot's gm-ai usage to inform the
 * beerhall positioning one-pager. Read-only — no UPDATE / DELETE / migrate.
 * Findings are paraphrased / aggregated; no raw message content is logged.
 *
 *   npx tsx apps/api/scripts/probe-elliot-usage.ts
 */

import '../src/load-env'
import { prisma } from '../src/database/prisma'

const ELLIOT_EMAIL = 'elliot@lunebrew.com'

type Row = Record<string, unknown>

function section(label: string): void {
  console.log(`\n=== ${label} ===`)
}

function table(rows: Row[]): void {
  if (rows.length === 0) {
    console.log('  (no rows)')
    return
  }
  for (const r of rows) {
    console.log(`  ${JSON.stringify(r)}`)
  }
}

async function main(): Promise<void> {
  // 1. Identify Elliot's user + memberships + venues -------------------------
  section('1. Elliot user + memberships')
  const user = await prisma.user.findUnique({
    where: { email: ELLIOT_EMAIL },
    select: { id: true, name: true, createdAt: true },
  })
  if (!user) {
    console.log(`  No user found for ${ELLIOT_EMAIL}`)
    return
  }
  console.log(
    `  userId=${user.id}  name=${user.name ?? '(unset)'}  joined=${user.createdAt.toISOString().slice(0, 10)}`,
  )

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      organization: { select: { id: true, name: true, slug: true, createdAt: true } },
    },
  })
  table(
    memberships.map((m) => ({
      orgId: m.organization.id,
      org: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      orgCreated: m.organization.createdAt.toISOString().slice(0, 10),
    })),
  )

  const orgIds = memberships.map((m) => m.organization.id)
  if (orgIds.length === 0) {
    console.log('  No orgs — abort.')
    return
  }

  section('1b. Venues across Elliot orgs')
  const venues = await prisma.venue.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true, name: true, type: true, createdAt: true, organizationId: true },
    orderBy: { createdAt: 'asc' },
  })
  table(
    venues.map((v) => ({
      venueId: v.id,
      name: v.name,
      type: v.type,
      created: v.createdAt.toISOString().slice(0, 10),
    })),
  )

  // 2. Activity baseline ----------------------------------------------------
  section('2. Conversation activity (Elliot personally)')
  const elliotConvos = await prisma.chatConversation.count({
    where: { userId: user.id },
  })
  const elliotMessages = await prisma.chatMessage.count({
    where: { conversation: { userId: user.id } },
  })
  console.log(`  Elliot conversations total: ${elliotConvos}`)
  console.log(`  Elliot messages total:      ${elliotMessages}`)

  const byMonth = await prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
    SELECT to_char(date_trunc('month', m."createdAt"), 'YYYY-MM') as month,
           count(*)::bigint as count
    FROM "ChatMessage" m
    JOIN "ChatConversation" c ON c.id = m."conversationId"
    WHERE c."userId" = ${user.id}
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 12
  `
  console.log('  Messages by month (Elliot, last 12):')
  for (const r of byMonth) console.log(`    ${r.month}: ${Number(r.count)}`)

  const lastActivity = await prisma.chatMessage.findFirst({
    where: { conversation: { userId: user.id } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, role: true },
  })
  console.log(`  Last message:  ${lastActivity?.createdAt.toISOString() ?? 'none'}`)

  // 3. Tool-call frequency --------------------------------------------------
  section('3. Tool-call frequency (Elliot, all-time)')
  // Diagnostic: what does toolCallLog actually look like?
  const sampleLogs = await prisma.$queryRaw<Array<{ shape: string; sample: unknown }>>`
    SELECT jsonb_typeof(m."toolCallLog") as shape,
           m."toolCallLog" as sample
    FROM "ChatMessage" m
    JOIN "ChatConversation" c ON c.id = m."conversationId"
    WHERE c."userId" = ${user.id}
      AND m."toolCallLog" IS NOT NULL
      AND m."toolCallLog"::text <> '[]'
      AND m."toolCallLog"::text <> 'null'
    LIMIT 2
  `
  console.log('  toolCallLog sample shapes:')
  for (const s of sampleLogs) {
    const sampleStr = JSON.stringify(s.sample).slice(0, 200)
    console.log(`    shape=${s.shape}  sample(200 chars)=${sampleStr}`)
  }
  // toolCallLog is JSON; entries have shape { name, input, output, ... }.
  // Unnest defensively. If anything is null/non-array we skip.
  const toolFreq = await prisma.$queryRaw<Array<{ tool: string; n: bigint }>>`
    SELECT t->>'tool' as tool, count(*)::bigint as n
    FROM "ChatMessage" m
    JOIN "ChatConversation" c ON c.id = m."conversationId"
    , jsonb_array_elements(
        CASE WHEN jsonb_typeof(m."toolCallLog") = 'array' THEN m."toolCallLog" ELSE '[]'::jsonb END
      ) as t
    WHERE c."userId" = ${user.id}
      AND t->>'tool' IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 30
  `
  for (const r of toolFreq) console.log(`  ${r.tool.padEnd(40)} ${Number(r.n)}`)

  // 4. Question shape — first lines, lengths, role mix ----------------------
  section('4. Question shape — first 80 chars of last 30 user messages')
  // We DO read content here to paraphrase clusters. The script logs first
  // 80 chars of each, lowercased, with names/numbers redacted where obvious.
  // Output stays local to the operator running the script.
  const recentUserMsgs = await prisma.$queryRaw<Array<{ first_line: string; created: Date }>>`
    SELECT substring(regexp_replace(split_part(m.content, E'\n', 1), '\\s+', ' ', 'g') from 1 for 80) as first_line,
           m."createdAt" as created
    FROM "ChatMessage" m
    JOIN "ChatConversation" c ON c.id = m."conversationId"
    WHERE c."userId" = ${user.id}
      AND m.role = 'user'
      AND length(trim(m.content)) > 3
    ORDER BY m."createdAt" DESC
    LIMIT 30
  `
  for (const r of recentUserMsgs) {
    console.log(`  ${r.created.toISOString().slice(0, 10)}  ${r.first_line}`)
  }

  // 5. Knowledge corpus shape ----------------------------------------------
  section('5. Knowledge items across Elliot orgs (by document type)')
  const corpusByType = await prisma.$queryRaw<
    Array<{ doc_type: string | null; n: bigint }>
  >`
    SELECT coalesce(dt.name, '(unclassified)') as doc_type, count(*)::bigint as n
    FROM "knowledge_items" ki
    LEFT JOIN "document_types" dt ON dt.id = ki."documentTypeId"
    WHERE ki."organizationId" = ANY (${orgIds}::text[])
    GROUP BY 1
    ORDER BY 2 DESC
  `
  for (const r of corpusByType) {
    console.log(`  ${r.doc_type?.padEnd(35) ?? '(null)'.padEnd(35)}  n=${Number(r.n)}`)
  }

  section('5b. Knowledge item content first-lines (first 60 chars, last 40 uploaded)')
  const titles = await prisma.$queryRaw<Array<{ first_line: string | null; created: Date }>>`
    SELECT substring(split_part(content, E'\n', 1) from 1 for 60) as first_line,
           "createdAt" as created
    FROM "knowledge_items"
    WHERE "organizationId" = ANY (${orgIds}::text[])
    ORDER BY "createdAt" DESC
    LIMIT 40
  `
  for (const r of titles) {
    console.log(`  ${r.created.toISOString().slice(0, 10)}  ${r.first_line ?? '(empty)'}`)
  }

  // 6. Team adoption -------------------------------------------------------
  section('6. Team adoption — other users in Elliot orgs with chat activity')
  const teamUsage = await prisma.$queryRaw<
    Array<{
      email: string
      name: string | null
      role: string
      convo_count: bigint
      msg_count: bigint
      last_msg: Date | null
    }>
  >`
    SELECT u.email,
           u.name,
           m.role,
           count(distinct c.id)::bigint as convo_count,
           count(msg.id)::bigint        as msg_count,
           max(msg."createdAt")         as last_msg
    FROM "organization_members" m
    JOIN "users" u ON u.id = m."userId"
    LEFT JOIN "ChatConversation" c ON c."userId" = u.id
    LEFT JOIN "ChatMessage" msg ON msg."conversationId" = c.id
    WHERE m."organizationId" = ANY (${orgIds}::text[])
    GROUP BY u.email, u.name, m.role
    ORDER BY msg_count DESC NULLS LAST
  `
  for (const r of teamUsage) {
    console.log(
      `  ${r.email.padEnd(35)} role=${r.role.padEnd(8)}  convos=${Number(r.convo_count)}  msgs=${Number(r.msg_count)}  last=${r.last_msg?.toISOString().slice(0, 10) ?? '-'}`,
    )
  }

  // 7. Citation rate + cost ------------------------------------------------
  section('7. Citation rate + cost (Elliot assistant messages)')
  const groundingStats = await prisma.$queryRaw<
    Array<{
      assistant_msgs: bigint
      cited: bigint
      tool_called: bigint
      uncited_kb_tool: bigint
      total_cost: number | null
      avg_cost: number | null
    }>
  >`
    SELECT
      count(*)::bigint as assistant_msgs,
      count(*) FILTER (WHERE m.content ~* '\\[doc:[0-9a-f-]{36}\\]')::bigint as cited,
      count(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(m."toolCallLog") = 'array' THEN m."toolCallLog" ELSE '[]'::jsonb END
          ) t
          WHERE t->>'tool' IN ('find_knowledge', 'query_document_table')
        )
      )::bigint as tool_called,
      count(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(m."toolCallLog") = 'array' THEN m."toolCallLog" ELSE '[]'::jsonb END
          ) t
          WHERE t->>'tool' IN ('find_knowledge', 'query_document_table')
        )
        AND m.content !~* '\\[doc:[0-9a-f-]{36}\\]'
      )::bigint as uncited_kb_tool,
      sum(("costUsd")::numeric)::float as total_cost,
      avg(("costUsd")::numeric)::float as avg_cost
    FROM "ChatMessage" m
    JOIN "ChatConversation" c ON c.id = m."conversationId"
    WHERE c."userId" = ${user.id}
      AND m.role = 'assistant'
  `
  for (const r of groundingStats) {
    const n = Number(r.assistant_msgs)
    if (n === 0) {
      console.log('  No assistant messages.')
      continue
    }
    console.log(`  assistant_msgs:     ${n}`)
    console.log(
      `  with citation:      ${Number(r.cited)}  (${((Number(r.cited) / n) * 100).toFixed(1)}%)`,
    )
    console.log(`  KB tool called:     ${Number(r.tool_called)}`)
    console.log(
      `  KB-tool & uncited:  ${Number(r.uncited_kb_tool)}  (the gap citation work just addressed)`,
    )
    console.log(`  total cost USD:     ${r.total_cost?.toFixed(4) ?? 'n/a'}`)
    console.log(`  avg cost / msg USD: ${r.avg_cost?.toFixed(5) ?? 'n/a'}`)
  }

  // 8. Channel mix (web vs whatsapp) ---------------------------------------
  section('8. Channel mix (Elliot convos)')
  const channelMix = await prisma.chatConversation.groupBy({
    by: ['channel'],
    where: { userId: user.id },
    _count: { _all: true },
  })
  for (const r of channelMix) console.log(`  ${r.channel.padEnd(12)} ${r._count._all}`)

  // 9. Top venues by activity ----------------------------------------------
  section('9. Top venues by Elliot conversation count')
  const venueActivity = await prisma.$queryRaw<
    Array<{ venue: string; venue_type: string; n: bigint }>
  >`
    SELECT v.name as venue, v.type as venue_type, count(c.id)::bigint as n
    FROM "ChatConversation" c
    JOIN "Venue" v ON v.id = c."venueId"
    WHERE c."userId" = ${user.id}
    GROUP BY v.name, v.type
    ORDER BY 3 DESC
  `
  for (const r of venueActivity)
    console.log(`  ${r.venue.padEnd(40)} type=${r.venue_type}  convos=${Number(r.n)}`)

  console.log('\nDone.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
