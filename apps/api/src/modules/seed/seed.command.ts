import { Command, CommandRunner } from 'nest-commander'
import { Logger } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import { EmbeddingsService } from '../embeddings/embeddings.service'
import { IngestService } from '../ingest/ingest.service'
import {
  venues,
  mockSupplierSeeds,
  mockStockCategorySeeds,
  mockStockSeeds,
  knowledgeSeeds,
  venueContacts,
} from './seed-data'

@Command({ name: 'seed', description: 'Seed NeonDB with POC fixture + embeddings' })
export class SeedCommand extends CommandRunner {
  private readonly logger = new Logger(SeedCommand.name)

  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly ingest: IngestService,
  ) {
    super()
  }

  async run(): Promise<void> {
    this.logger.log(`Upserting ${venues.length} venues...`)
    for (const v of venues) {
      await prisma.venue.upsert({
        where: { id: v.id },
        create: { id: v.id, name: v.name, address: v.address, type: v.type },
        update: { name: v.name, address: v.address, type: v.type },
      })
    }

    this.logger.log(`Upserting ${mockSupplierSeeds.length} mock suppliers...`)
    for (const s of mockSupplierSeeds) {
      await prisma.mockSupplier.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          name: s.name,
          contactName: s.contactName,
          email: s.email,
          phone: s.phone,
          leadTimeDays: s.leadTimeDays,
          notes: s.notes,
        },
        update: {
          name: s.name,
          contactName: s.contactName,
          email: s.email,
          phone: s.phone,
          leadTimeDays: s.leadTimeDays,
          notes: s.notes,
        },
      })
    }

    this.logger.log(`Upserting ${mockStockCategorySeeds.length} mock stock categories...`)
    for (const c of mockStockCategorySeeds) {
      await prisma.mockStockCategory.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name },
        update: { name: c.name },
      })
    }

    this.logger.log(`Embedding ${mockStockSeeds.length} mock stock items (batch)...`)
    const stockEmbeddingTexts = mockStockSeeds.map((s) => {
      const catName = mockStockCategorySeeds.find((c) => c.id === s.categoryId)?.name ?? ''
      const parts = [s.name, `Category: ${catName}`, `Unit: ${s.unitSize ?? s.unit}`]
      if (s.notes) parts.push(s.notes)
      return parts.join('. ')
    })
    const stockVectors = await this.embeddings.embedDocuments(stockEmbeddingTexts)

    this.logger.log(`Upserting mock stock items + refreshing vectors...`)
    for (let i = 0; i < mockStockSeeds.length; i++) {
      const item = mockStockSeeds[i]
      await prisma.mockStock.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          venueId: item.venueId,
          supplierId: item.supplierId,
          categoryId: item.categoryId,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          unitSize: item.unitSize,
          currentQty: item.currentQty,
          parLevel: item.parLevel,
          reorderQty: item.reorderQty,
          costPerUnit: item.costPerUnit,
          avgWeeklyUsage: item.avgWeeklyUsage,
          notes: item.notes,
          embeddingText: stockEmbeddingTexts[i],
        },
        update: {
          venueId: item.venueId,
          supplierId: item.supplierId,
          categoryId: item.categoryId,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          unitSize: item.unitSize,
          currentQty: item.currentQty,
          parLevel: item.parLevel,
          reorderQty: item.reorderQty,
          costPerUnit: item.costPerUnit,
          avgWeeklyUsage: item.avgWeeklyUsage,
          notes: item.notes,
          embeddingText: stockEmbeddingTexts[i],
        },
      })
      const vec = stockVectors[i]
      await prisma.$executeRawUnsafe(
        `UPDATE "mock_stock" SET embedding = $1::vector WHERE id = $2`,
        `[${vec.join(',')}]`,
        item.id,
      )
    }

    this.logger.log(`Upserting ${venueContacts.length} venue contacts...`)
    for (const c of venueContacts) {
      const existing = await prisma.venueContact.findFirst({
        where: { venueId: c.venueId, name: c.name, role: c.role },
      })
      if (existing) {
        await prisma.venueContact.update({
          where: { id: existing.id },
          data: {
            phone: c.phone,
            email: c.email,
            isEmergencyContact: c.isEmergencyContact,
            notes: c.notes,
          },
        })
      } else {
        await prisma.venueContact.create({ data: { ...c } })
      }
    }

    this.logger.log(`Ingesting ${knowledgeSeeds.length} knowledge docs (sequential)...`)
    for (const doc of knowledgeSeeds) {
      const { metadata } = await this.ingest.ingest({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        content: doc.content,
        venueId: doc.venueId ?? null,
      })
      const emergentKeys = Object.keys(metadata).filter(
        (k) => !['summary', 'tags', 'docType', 'category', 'crossRefs'].includes(k),
      )
      this.logger.log(
        `  ✓ ${doc.title} — docType=${metadata.docType ?? 'n/a'} tags=${metadata.tags?.length ?? 0} crossRefs=${metadata.crossRefs?.length ?? 0} emergent=[${emergentKeys.join(',')}]`,
      )
    }

    this.logger.log('Seed complete.')
    await prisma.$disconnect()
  }
}
