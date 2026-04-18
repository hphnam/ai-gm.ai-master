import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { prisma } from '@gm-ai/database'
import { TOOL_DEFINITIONS } from '@gm-ai/types'
import { AdaptationService } from '../adaptation/adaptation.service'
import { ToolDispatcher } from './tool-dispatcher'
import { CHAT_SYSTEM_PROMPT } from './system-prompt'

const MAX_ROUNDS = 6
const MAX_TOKENS = 2048
const MAX_USER_MESSAGE_CHARS = 8000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SendMessageInputSchema = z.object({
  conversationId: z.string().regex(UUID_RE, 'invalid uuid').optional(),
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
  userMessage: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
})

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>

export type ToolCallLogEntry = {
  round: number
  toolUseId: string
  tool: string
  input: unknown
  result: unknown
}

export type SendMessageResult = {
  conversationId: string
  assistantMessage: { id: string; content: string }
  toolCallLog: ToolCallLogEntry[]
  retrievedItemIds: string[]
}

type AnthropicMsg = Anthropic.Messages.MessageParam

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name)
  private client!: Anthropic

  constructor(
    private readonly dispatcher: ToolDispatcher,
    private readonly adaptation: AdaptationService,
  ) {}

  onModuleInit() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    this.client = new Anthropic({ apiKey })
  }

  async sendMessage(rawInput: SendMessageInput): Promise<SendMessageResult> {
    const parsed = SendMessageInputSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new Error(
        `invalid sendMessage input: ${parsed.error.issues[0]?.message ?? 'zod error'}`,
      )
    }
    const input = parsed.data

    const venue = await prisma.venue.findUnique({
      where: { id: input.venueId },
      select: { id: true, name: true },
    })
    if (!venue) throw new Error(`venue ${input.venueId} not found`)

    if (input.conversationId) {
      const existing = await prisma.chatConversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, venueId: true },
      })
      if (!existing) throw new Error(`conversation ${input.conversationId} not found`)
      if (existing.venueId !== venue.id) {
        throw new Error(
          `conversation ${input.conversationId} does not belong to venue ${venue.id}`,
        )
      }
    }

    const conversationId =
      input.conversationId ??
      (
        await prisma.chatConversation.create({
          data: { venueId: input.venueId, channel: 'web' },
          select: { id: true },
        })
      ).id

    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: input.userMessage,
        retrievedItemIds: [],
        toolCallLog: [],
      },
    })

    const history = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { role: true, content: true },
    })
    const messages: AnthropicMsg[] = history.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

    const contextualSystemPrompt = `${CHAT_SYSTEM_PROMPT}\n\n<current_context>\nvenueId: ${venue.id}\nvenueName: ${venue.name}\n</current_context>`

    const toolCallLog: ToolCallLogEntry[] = []
    const retrievedItemIds = new Set<string>()
    let finalText = ''

    try {
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const roundStart = Date.now()
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: MAX_TOKENS,
          system: contextualSystemPrompt,
          tools: TOOL_DEFINITIONS as unknown as Anthropic.Messages.Tool[],
          messages,
        })

        this.logger.log(
          JSON.stringify({
            event: 'chat.claude_call',
            conversationId,
            round,
            stop_reason: response.stop_reason,
            input_tokens: response.usage?.input_tokens ?? null,
            output_tokens: response.usage?.output_tokens ?? null,
            latency_ms: Date.now() - roundStart,
          }),
        )

        messages.push({ role: 'assistant', content: response.content })

        if (response.stop_reason !== 'tool_use') {
          const textBlocks = response.content.filter(
            (b): b is Anthropic.Messages.TextBlock => b.type === 'text',
          )
          finalText = textBlocks.map((b) => b.text).join('\n').trim()
          if (!finalText) {
            this.logger.warn(
              JSON.stringify({
                event: 'chat.empty_assistant_text',
                conversationId,
                stop_reason: response.stop_reason,
              }),
            )
            finalText = "I couldn't produce an answer — please retry or rephrase."
          }
          break
        }

        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
        )

        const results = await Promise.all(
          toolUseBlocks.map(async (block) => ({
            block,
            result: await this.dispatcher.dispatch(block.name, block.input),
          })),
        )

        for (const { block, result } of results) {
          toolCallLog.push({
            round,
            toolUseId: block.id,
            tool: block.name,
            input: block.input,
            result,
          })
          if (block.name === 'find_knowledge' && result.ok) {
            const hits = result.data as Array<{ id: string }>
            for (const h of hits) retrievedItemIds.add(h.id)
          }
        }

        messages.push({
          role: 'user',
          content: results.map(({ block, result }) => ({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
            is_error: !result.ok && result.reason === 'error',
          })) as unknown as Anthropic.Messages.ToolResultBlockParam[],
        })

        if (round === MAX_ROUNDS) {
          this.logger.warn(
            JSON.stringify({
              event: 'chat.tool_loop_capped',
              conversationId,
              rounds: MAX_ROUNDS,
            }),
          )
          finalText =
            'I hit the tool-use round limit while working on your question — can you narrow it down?'
        }
      }
    } catch (err) {
      const message = (err as Error).message ?? 'unknown anthropic error'
      this.logger.error(
        JSON.stringify({
          event: 'chat.anthropic_error',
          conversationId,
          rounds_completed:
            toolCallLog.length > 0 ? Math.max(...toolCallLog.map((e) => e.round)) : 0,
          message,
        }),
      )
      finalText = 'I hit an error calling the model — please retry.'
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: finalText,
        retrievedItemIds: Array.from(retrievedItemIds),
        toolCallLog: toolCallLog as unknown as object,
      },
      select: { id: true, content: true },
    })

    await this.adaptation.captureRetrievalOutcome({
      assistantMessageId: assistantMessage.id,
      toolCallLog,
      retrievedItemIds: Array.from(retrievedItemIds),
    })

    return {
      conversationId,
      assistantMessage,
      toolCallLog,
      retrievedItemIds: Array.from(retrievedItemIds),
    }
  }
}
