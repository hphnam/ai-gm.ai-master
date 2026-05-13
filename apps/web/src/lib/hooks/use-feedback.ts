'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CaptureFeedbackInputDto as CaptureFeedbackInput,
  FeedbackResponseDto as FeedbackResponse,
} from '@/generated/api'
import { apiPost } from '../api-client'
import { mapApiError } from '../map-api-error'

export function useFeedback() {
  return useMutation({
    mutationFn: (body: CaptureFeedbackInput) => apiPost<FeedbackResponse>('/feedback', body),
    onSuccess: () => toast.success('Thanks for the feedback'),
    onError: (err) => toast.error(mapApiError(err)),
  })
}
