/**
 * Phase A2 — backfill SearchableEntity from existing source tables.
 *
 *   tsx apps/api/scripts/backfill-searchable-entity.ts
 *
 * Idempotent and resumable: every write is an upsert keyed on
 * (entityType, entityId, subKey). Re-runs cost nothing for rows already indexed.
 *
 *   - knowledge_item rows: copies the existing pgvector embedding directly
 *     via a single SQL INSERT … SELECT. No Voyage cost.
 *   - checklist_step / venue_contact / mock_supplier rows: fresh Voyage
 *     embeddings per row, batched.
 *   - chat_message and venue_profile: deferred to their respective phases.
 */

import '../src/load-env'
import { VoyageAIClient } from 'voyageai'
import { prisma } from '../src/database/prisma'
import { VOYAGE_EMBED_MODEL } from '../src/types/section'

const BATCH_SIZE = 32

type Step = { index: number; text: string; kind?: string; required?: boolean }
type Schedule = { cadence?: string }

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} not set`)
  return v
}

const voyage = new VoyageAIClient({ apiKey: requireEnv('VOYAGE_API_KEY') })

async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const response = await voyage.embed({
    model: VOYAGE_EMBED_MODEL,
    input: texts,
    inputType: 'document',
  })
  return response.data!.map((d) => d.embedding!)
}

async function backfillKnowledgeItems(): Promise<number> {
  // SQL bulk copy — preserves existing embedding without re-billing Voyage.
  // Tags / kind / summary derived from metadata JSON via expressions.
  const result = await prisma.$executeRawUnsafe(`
    INSERT INTO "searchable_entities" (
      "id", "organizationId", "venueId", "entityType", "entityId", "subKey",
      "embedding", "embeddingText", "tags", "kind", "title", "summary",
      "metadata", "createdAt", "updatedAt"
    )
    SELECT
      gen_random_uuid(),
      ki."organizationId",
      ki."venueId",
      'knowledge_item',
      ki.id,
      '',
      ki.embedding,
      COALESCE(ki."embeddingText", LEFT(ki.content, 8000)),
      COALESCE(
        ARRAY(
          SELECT jsonb_array_elements_text(ki.metadata->'tags')
          WHERE jsonb_typeof(ki.metadata->'tags') = 'array'
        ),
        '{}'::text[]
      ),
      ki.metadata->>'docType',
      LEFT(ki.content, 200),
      ki."aiSummary",
      jsonb_build_object(
        'documentTypeId', ki."documentTypeId",
        'contentLength', LENGTH(ki.content),
        'backfilled', true
      ),
      ki."createdAt",
      NOW()
    FROM "knowledge_items" ki
    WHERE ki.embedding IS NOT NULL
    ON CONFLICT ("entityType", "entityId", "subKey") DO UPDATE
      SET "embedding"     = EXCLUDED."embedding",
          "embeddingText" = EXCLUDED."embeddingText",
          "tags"          = EXCLUDED."tags",
          "kind"          = EXCLUDED."kind",
          "title"         = EXCLUDED."title",
          "summary"       = EXCLUDED."summary",
          "metadata"      = EXCLUDED."metadata",
          "updatedAt"     = NOW()
  `)
  return Number(result)
}

async function backfillChecklistSteps(): Promise<number> {
  let written = 0
  const checklists = await prisma.checklist.findMany({
    select: {
      id: true,
      organizationId: true,
      title: true,
      steps: true,
      schedule: true,
      knowledgeItemId: true,
      knowledgeItem: { select: { venueId: true } },
    },
  })

  for (const checklist of checklists) {
    const steps = (checklist.steps as unknown as Step[]) ?? []
    if (steps.length === 0) continue
    const cadence = (checklist.schedule as Schedule)?.cadence ?? null

    for (let i = 0; i < steps.length; i += BATCH_SIZE) {
      const batch = steps.slice(i, i + BATCH_SIZE)
      const texts = batch.map((s) => `${checklist.title} — step ${s.index + 1}: ${s.text}`)
      const vectors = await embedDocuments(texts)

      for (let j = 0; j < batch.length; j++) {
        const step = batch[j]
        const vec = vectors[j]
        const tags = [checklist.title, cadence].filter((t): t is string => !!t)
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO "searchable_entities" (
            "id", "organizationId", "venueId", "entityType", "entityId", "subKey",
            "embedding", "embeddingText", "tags", "kind", "title", "summary",
            "metadata", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, 'checklist_step', $3, $4,
            $5::vector, $6, $7::text[], $8, $9, $10,
            $11::jsonb, NOW(), NOW()
          )
          ON CONFLICT ("entityType", "entityId", "subKey") DO UPDATE
            SET "organizationId" = EXCLUDED."organizationId",
                "venueId"        = EXCLUDED."venueId",
                "embedding"      = EXCLUDED."embedding",
                "embeddingText"  = EXCLUDED."embeddingText",
                "tags"           = EXCLUDED."tags",
                "kind"           = EXCLUDED."kind",
                "title"          = EXCLUDED."title",
                "summary"        = EXCLUDED."summary",
                "metadata"       = EXCLUDED."metadata",
                "updatedAt"      = NOW()
          `,
          checklist.organizationId,
          checklist.knowledgeItem?.venueId ?? null,
          checklist.id,
          String(step.index),
          `[${vec.join(',')}]`,
          texts[j],
          tags,
          step.kind ?? null,
          `${checklist.title} — step ${step.index + 1}`,
          step.text,
          JSON.stringify({
            checklistId: checklist.id,
            knowledgeItemId: checklist.knowledgeItemId,
            stepIndex: step.index,
            stepKind: step.kind ?? null,
            required: step.required ?? null,
            cadence,
            backfilled: true,
          }),
        )
        written++
      }
    }
  }
  return written
}

async function backfillVenueContacts(): Promise<number> {
  let written = 0
  const contacts = await prisma.venueContact.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      email: true,
      isEmergencyContact: true,
      notes: true,
      venue: { select: { id: true, organizationId: true, name: true } },
    },
  })
  if (contacts.length === 0) return 0

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE)
    const texts = batch.map((c) =>
      [
        `${c.name} — ${c.role} at ${c.venue.name}`,
        c.phone ? `phone: ${c.phone}` : null,
        c.email ? `email: ${c.email}` : null,
        c.isEmergencyContact ? 'emergency contact' : null,
        c.notes,
      ]
        .filter(Boolean)
        .join('. '),
    )
    const vectors = await embedDocuments(texts)

    for (let j = 0; j < batch.length; j++) {
      const c = batch[j]
      const tags = [c.role, c.isEmergencyContact ? 'emergency' : null].filter(
        (t): t is string => !!t,
      )
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "searchable_entities" (
          "id", "organizationId", "venueId", "entityType", "entityId", "subKey",
          "embedding", "embeddingText", "tags", "kind", "title", "summary",
          "metadata", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, 'venue_contact', $3, '',
          $4::vector, $5, $6::text[], $7, $8, $9,
          $10::jsonb, NOW(), NOW()
        )
        ON CONFLICT ("entityType", "entityId", "subKey") DO UPDATE
          SET "organizationId" = EXCLUDED."organizationId",
              "venueId"        = EXCLUDED."venueId",
              "embedding"      = EXCLUDED."embedding",
              "embeddingText"  = EXCLUDED."embeddingText",
              "tags"           = EXCLUDED."tags",
              "kind"           = EXCLUDED."kind",
              "title"          = EXCLUDED."title",
              "summary"        = EXCLUDED."summary",
              "metadata"       = EXCLUDED."metadata",
              "updatedAt"      = NOW()
        `,
        c.venue.organizationId,
        c.venue.id,
        c.id,
        `[${vectors[j].join(',')}]`,
        texts[j],
        tags,
        c.role,
        c.name,
        c.notes,
        JSON.stringify({
          phone: c.phone,
          email: c.email,
          isEmergencyContact: c.isEmergencyContact,
          venueId: c.venue.id,
          backfilled: true,
        }),
      )
      written++
    }
  }
  return written
}

async function backfillMockSuppliers(): Promise<number> {
  // Mock suppliers are org-agnostic in the schema — we index per row but
  // attach them to every venue via NULL venueId; the agent's find_knowledge
  // already treats NULL-venue rows as global. orgId can't be derived
  // directly, so we replicate per organisation that has at least one venue.
  const suppliers = await prisma.mockSupplier.findMany({
    select: {
      id: true,
      name: true,
      contactName: true,
      email: true,
      phone: true,
      leadTimeDays: true,
      notes: true,
    },
  })
  if (suppliers.length === 0) return 0

  const orgs = await prisma.organization.findMany({ select: { id: true } })
  if (orgs.length === 0) return 0

  let written = 0
  for (let i = 0; i < suppliers.length; i += BATCH_SIZE) {
    const batch = suppliers.slice(i, i + BATCH_SIZE)
    const texts = batch.map((s) =>
      [
        `${s.name} (supplier)`,
        s.contactName ? `contact: ${s.contactName}` : null,
        s.phone ? `phone: ${s.phone}` : null,
        s.email ? `email: ${s.email}` : null,
        `lead time: ${s.leadTimeDays} days`,
        s.notes,
      ]
        .filter(Boolean)
        .join('. '),
    )
    const vectors = await embedDocuments(texts)

    for (let j = 0; j < batch.length; j++) {
      const s = batch[j]
      for (const org of orgs) {
        const subKey = org.id
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO "searchable_entities" (
            "id", "organizationId", "venueId", "entityType", "entityId", "subKey",
            "embedding", "embeddingText", "tags", "kind", "title", "summary",
            "metadata", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, NULL, 'mock_supplier', $2, $3,
            $4::vector, $5, '{}'::text[], 'supplier', $6, $7,
            $8::jsonb, NOW(), NOW()
          )
          ON CONFLICT ("entityType", "entityId", "subKey") DO UPDATE
            SET "organizationId" = EXCLUDED."organizationId",
                "embedding"      = EXCLUDED."embedding",
                "embeddingText"  = EXCLUDED."embeddingText",
                "kind"           = EXCLUDED."kind",
                "title"          = EXCLUDED."title",
                "summary"        = EXCLUDED."summary",
                "metadata"       = EXCLUDED."metadata",
                "updatedAt"      = NOW()
          `,
          org.id,
          s.id,
          subKey,
          `[${vectors[j].join(',')}]`,
          texts[j],
          s.name,
          s.notes,
          JSON.stringify({
            contactName: s.contactName,
            email: s.email,
            phone: s.phone,
            leadTimeDays: s.leadTimeDays,
            backfilled: true,
          }),
        )
        written++
      }
    }
  }
  return written
}

async function main(): Promise<void> {
  const t0 = Date.now()
  console.log('▸ backfilling knowledge_items (SQL bulk copy)…')
  const ki = await backfillKnowledgeItems()
  console.log(`   ${ki} rows`)

  console.log('▸ backfilling checklist_step…')
  const steps = await backfillChecklistSteps()
  console.log(`   ${steps} rows`)

  console.log('▸ backfilling venue_contact…')
  const contacts = await backfillVenueContacts()
  console.log(`   ${contacts} rows`)

  console.log('▸ backfilling mock_supplier (per-org)…')
  const suppliers = await backfillMockSuppliers()
  console.log(`   ${suppliers} rows`)

  console.log(
    `\n✓ done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${ki + steps + contacts + suppliers} total rows indexed`,
  )
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('✗ backfill failed:', err)
  process.exit(1)
})
