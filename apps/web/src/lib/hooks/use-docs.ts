'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateDocRequest,
  CreateDocResponse,
  DocDetail,
  DocListItem,
} from '@gm-ai/types'
import { apiFetch, apiPost } from '@/lib/api-client'

export function useDocs() {
  return useQuery<DocListItem[]>({
    queryKey: ['docs'],
    queryFn: ({ signal }) => apiFetch<DocListItem[]>('/docs', { signal }),
    staleTime: 30_000,
  })
}

export function useDoc(id: string | null) {
  return useQuery<DocDetail>({
    queryKey: ['docs', id],
    queryFn: ({ signal }) => apiFetch<DocDetail>(`/docs/${id!}`, { signal }),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

export function useCreateDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDocRequest) =>
      apiPost<CreateDocResponse>('/docs', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}
