// Plan 06-01 Task 2 — chat-v2 orchestrator stub.
//
// Task 2 lands the dispatch boundary: Triage runs, then we return a stub
// payload so the chat.controller dispatch swap is exercisable end-to-end before
// Task 3 fills in Researcher + Writer + cost capture. Task 3 replaces this
// implementation in-place.
//
// NOTE: stub mode skips the user/assistant chat_messages persistence that the
// real Task 3 implementation will own — this keeps the boundary self-contained
// for integration testing without leaking partial v2 rows into production data.

import { Injectable } from '@nestjs/common'
import { sanitizeForTriage } from './input-sanitizer'
import { TriageService } from './triage.service'
import type { TriageOutput } from '../../types'
import type { SendMessageInput, SendMessageResult } from '../chat/chat.service'

export type ChatV2DispatchContext = {
  orgId: string
  userId: string
  userRole: string
  userIdentity: { name: string | null; email: string }
}

export type ChatV2StubResult = SendMessageResult & {
  v2: {
    stub: true
    message: 'NOT_IMPLEMENTED — Task 3 pending'
    triageOutput: TriageOutput
  }
}

@Injectable()
export class ChatV2Service {
  constructor(private readonly triage: TriageService) {}

  async sendMessage(
    input: SendMessageInput,
    ctx: ChatV2DispatchContext,
  ): Promise<ChatV2StubResult> {
    const sanitized = sanitizeForTriage(input.userMessage)
    const { output: triageOutput } = await this.triage.classify(sanitized)

    // Task 2 stub return — same SendMessageResult contract so the controller
    // dispatch is type-compatible. Task 3 replaces this with real Researcher
    // + Writer + cost capture flow.
    return {
      conversationId: input.conversationId ?? '',
      assistantMessage: {
        id: '',
        content: 'NOT_IMPLEMENTED — Task 3 pending',
        followUps: [],
      },
      toolCallLog: [],
      retrievedItemIds: [],
      v2: {
        stub: true,
        message: 'NOT_IMPLEMENTED — Task 3 pending',
        triageOutput,
      },
    }
  }
}
