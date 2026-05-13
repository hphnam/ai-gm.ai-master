'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ConversationResponseDto,
  UpdateConversationVisibilityDtoVisibility,
  UpdateConversationVisibilityResponseDto,
} from '@/generated/api'
import { apiFetch } from '../api-client'

type Vars = {
  conversationId: string
  venueId: string
  visibility: UpdateConversationVisibilityDtoVisibility
}

export function useUpdateConversationVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      conversationId,
      venueId,
      visibility,
    }: Vars): Promise<UpdateConversationVisibilityResponseDto> =>
      apiFetch<UpdateConversationVisibilityResponseDto>(
        `/chat/conversations/${conversationId}/visibility?venueId=${venueId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ visibility }),
        },
      ),
    onSuccess: (data, vars) => {
      qc.setQueryData<ConversationResponseDto | undefined>(
        ['conversation', vars.conversationId, vars.venueId],
        (prev) => (prev ? { ...prev, visibility: data.visibility } : prev),
      )
    },
  })
}
