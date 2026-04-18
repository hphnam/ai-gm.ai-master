import { Command, CommandRunner } from 'nest-commander'
import { Logger } from '@nestjs/common'
import { prisma } from '@gm-ai/database'
import { EmbeddingsService } from '../embeddings/embeddings.service'
import { EnrichmentService } from './enrichment.service'
import {
  venues,
  suppliers,
  stockCategories,
  stockItems,
  sopDocuments,
  venueContacts,
} from './seed-data'

@Command({ name: 'seed', description: 'Seed NeonDB with POC fixture + embeddings' })
export class SeedCommand extends CommandRunner {
  private readonly logger = new Logger(SeedCommand.name)

  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly enrichment: EnrichmentService,
  ) {
    super()
  }

  async run(): Promise<void> {
    this.logger.log('Wiping existing seed data...')
    await prisma.chatMessage.deleteMany()
    await prisma.chatConversation.deleteMany()
    await prisma.purchaseOrderItem.deleteMany()
    await prisma.purchaseOrder.deleteMany()
    await prisma.venueContact.deleteMany()
    await prisma.sopDocument.deleteMany()
    await prisma.stockItem.deleteMany()
    await prisma.stockCategory.deleteMany()
    await prisma.supplier.deleteMany()
    await prisma.venue.deleteMany()

    this.logger.log(`Inserting ${venues.length} venues...`)
    await prisma.venue.createMany({ data: [...venues] })

    this.logger.log(`Inserting ${suppliers.length} suppliers...`)
    await prisma.supplier.createMany({ data: [...suppliers] })

    this.logger.log(`Inserting ${stockCategories.length} stock categories...`)
    await prisma.stockCategory.createMany({ data: [...stockCategories] })

    this.logger.log(`Embedding ${stockItems.length} stock items (batch)...`)
    const stockEmbeddingTexts = stockItems.map((s) => {
      const catName = stockCategories.find((c) => c.id === s.categoryId)?.name ?? ''
      const parts = [
        s.name,
        `Category: ${catName}`,
        `Unit: ${s.unitSize ?? s.unit}`,
      ]
      if (s.notes) parts.push(s.notes)
      return parts.join('. ')
    })
    const stockVectors = await this.embeddings.embedDocuments(stockEmbeddingTexts)

    this.logger.log(`Inserting stock items + writing vectors...`)
    for (let i = 0; i < stockItems.length; i++) {
      const item = stockItems[i]
      await prisma.stockItem.create({
        data: {
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
      })
      const vec = stockVectors[i]
      await prisma.$executeRawUnsafe(
        `UPDATE "StockItem" SET embedding = $1::vector WHERE id = $2`,
        `[${vec.join(',')}]`,
        item.id,
      )
    }

    this.logger.log(`Enriching + embedding ${sopDocuments.length} SOPs (sequential)...`)
    for (const doc of sopDocuments) {
      const enriched = await this.enrichment.enrichSop(doc)
      const aiSummary = enriched?.summary ?? null
      const aiTags = enriched?.tags ?? []
      const embeddingText = `${doc.title}. ${aiSummary ?? ''}. Tags: ${aiTags.join(', ')}. ${doc.content}`
      const [vec] = await this.embeddings.embedDocuments([embeddingText])
      await prisma.sopDocument.create({
        data: {
          id: doc.id,
          venueId: doc.venueId,
          title: doc.title,
          category: doc.category,
          content: doc.content,
          updatedBy: doc.updatedBy,
          aiSummary,
          aiTags,
        },
      })
      await prisma.$executeRawUnsafe(
        `UPDATE "SopDocument" SET embedding = $1::vector WHERE id = $2`,
        `[${vec.join(',')}]`,
        doc.id,
      )
      this.logger.log(`  ✓ ${doc.title} — ${aiTags.length} tags`)
    }

    this.logger.log(`Inserting ${venueContacts.length} venue contacts...`)
    await prisma.venueContact.createMany({ data: [...venueContacts] })

    this.logger.log('Seed complete.')
    await prisma.$disconnect()
  }
}
