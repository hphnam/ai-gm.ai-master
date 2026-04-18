import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { VoyageAIClient } from 'voyageai'

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsService.name)
  private client!: VoyageAIClient

  onModuleInit() {
    const apiKey = process.env.VOYAGE_API_KEY
    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY is not set — add it to .env at repo root')
    }
    this.client = new VoyageAIClient({ apiKey })
  }

  async embedText(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: 'voyage-3',
      input: text,
      inputType: 'query',
    })
    return response.data![0].embedding!
  }

  async embedDocument(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: 'voyage-3',
      input: text,
      inputType: 'document',
    })
    return response.data![0].embedding!
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const response = await this.client.embed({
      model: 'voyage-3',
      input: texts,
      inputType: 'document',
    })
    return response.data!.map((d) => d.embedding!)
  }
}
