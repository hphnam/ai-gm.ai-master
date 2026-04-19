'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  SendChatMessageRequest,
  SendChatMessageResponse,
} from '@gm-ai/types'
import { apiPost } from '../api-client'

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: SendChatMessageRequest) =>
      apiPost<SendChatMessageResponse>('/chat/messages', body),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['conversation', data.conversationId, vars.venueId],
      })
    },
  })
}
