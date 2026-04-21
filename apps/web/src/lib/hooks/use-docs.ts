'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AcceptTypeResponse,
  ApiErrorResponse,
  CreateDocRequest,
  CreateDocResponse,
  DocDetail,
  DocListItem,
} from '@gm-ai/types'
import { API_URL, ApiError, apiFetch, apiPost } from '@/lib/api-client'

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

export function useUploadDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      file: File
      venueId: string | null
    }): Promise<CreateDocResponse> => {
      const requestId = crypto.randomUUID()
      const form = new FormData()
      form.append('file', args.file)
      if (args.venueId) form.append('venueId', args.venueId)
      const res = await fetch(API_URL + '/docs/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-request-id': requestId },
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        let body: ApiErrorResponse | null = null
        try {
          body = text ? (JSON.parse(text) as ApiErrorResponse) : null
        } catch {
          body = null
        }
        const serverRequestId = res.headers.get('x-request-id') ?? requestId
        throw new ApiError(res.status, body?.error ?? 'unknown', body?.details, serverRequestId)
      }
      return (await res.json()) as CreateDocResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}

// Plan 04-02 Task 3 — owner accepts the classifier's new-type proposal.
export function useAcceptDocType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) =>
      apiPost<AcceptTypeResponse>(`/docs/${docId}/accept-type`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}

// Plan 04-02 Task 3 — owner rejects the proposal (row stays "Unclassified").
export function useRejectDocType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (docId: string): Promise<void> => {
      const requestId = crypto.randomUUID()
      const res = await fetch(API_URL + `/docs/${docId}/reject-type`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-request-id': requestId, 'content-type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) {
        const text = await res.text()
        let body: ApiErrorResponse | null = null
        try {
          body = text ? (JSON.parse(text) as ApiErrorResponse) : null
        } catch {
          body = null
        }
        const serverRequestId = res.headers.get('x-request-id') ?? requestId
        throw new ApiError(res.status, body?.error ?? 'unknown', body?.details, serverRequestId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}

export function useDeleteDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const requestId = crypto.randomUUID()
      const res = await fetch(API_URL + `/docs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-request-id': requestId },
      })
      if (!res.ok) {
        const text = await res.text()
        let body: ApiErrorResponse | null = null
        try {
          body = text ? (JSON.parse(text) as ApiErrorResponse) : null
        } catch {
          body = null
        }
        const serverRequestId = res.headers.get('x-request-id') ?? requestId
        throw new ApiError(res.status, body?.error ?? 'unknown', body?.details, serverRequestId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}
