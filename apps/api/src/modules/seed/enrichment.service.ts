import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'

export type SopEnrichment = { summary: string; tags: string[] }

@Injectable()
export class EnrichmentService implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentService.name)
  private client!: Anthropic

  onModuleInit() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it to .env at repo root')
    this.client = new Anthropic({ apiKey })
  }

  async enrichSop(doc: { title: string; category: string; content: string }): Promise<SopEnrichment | null> {
    const prompt = `You are enriching an SOP document for a hospitality operations AI system.

Given the following SOP document, return a JSON object with:
- "summary": A 1-2 sentence plain-English summary of what this document covers
- "tags": An array of 5-10 lowercase semantic tags (e.g. ["ice_machine", "equipment", "error_codes", "troubleshooting"])

Respond ONLY with valid JSON. No markdown, no explanation.

Title: ${doc.title}
Category: ${doc.category}
Content:
${doc.content}`

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('')

    try {
      const parsed = JSON.parse(text) as SopEnrichment
      if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.tags)) {
        this.logger.warn(`Enrichment for "${doc.title}" returned wrong shape; skipping`)
        return null
      }
      return parsed
    } catch {
      this.logger.warn(`Enrichment for "${doc.title}" returned invalid JSON; skipping`)
      return null
    }
  }
}
