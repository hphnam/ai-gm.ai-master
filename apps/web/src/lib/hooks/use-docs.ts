'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AcceptTypeResponse,
  ApiErrorResponse,
  ClassifyDocRequest,
  ClassifyDocResponse,
  CreateDocRequest,
  CreateDocResponse,
  DocDetail,
  DocListItem,
  DocumentTypeDto,
  DocumentTypeKind,
  KbGapDto,
} from '@gm-ai/types'
import { API_URL, ApiError, apiFetch, apiPost } from '@/lib/api-client'

export function useDocs() {
  return useQuery<DocListItem[]>({
    queryKey: ['docs'],
    queryFn: ({ signal }) => apiFetch<DocListItem[]>('/docs', { signal }),
    staleTime: 30_000,
    // Poll every 3s while any doc is still enriching in the background. Stops
    // automatically once every row has settled to 'ready' or 'failed'.
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.some((d) => d.processingStatus === 'processing')) return 3_000
      return false
    },
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
      title?: string
      description?: string
    }): Promise<CreateDocResponse> => {
      const requestId = crypto.randomUUID()
      const form = new FormData()
      form.append('file', args.file)
      if (args.venueId) form.append('venueId', args.venueId)
      if (args.title && args.title.trim()) form.append('title', args.title.trim())
      if (args.description && args.description.trim())
        form.append('description', args.description.trim())
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
// Plan 04-03 Task 3 — optional kind override lets owner flip procedural↔reference pre-promote.
// Optional name lets the owner rename the proposed category before saving.
export function useAcceptDocType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      docId,
      kind,
      name,
    }: {
      docId: string
      kind?: DocumentTypeKind
      name?: string
    }) => {
      const body: Record<string, string> = {}
      if (kind) body.kind = kind
      if (name) body.name = name
      return apiPost<AcceptTypeResponse>(`/docs/${docId}/accept-type`, body)
    },
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

// Lists confirmed DocumentTypes for the current org — used by the manual-classify
// modal to offer "pick an existing category" before creating a new one.
export function useDocTypes() {
  return useQuery<DocumentTypeDto[]>({
    queryKey: ['docs', 'types'],
    queryFn: ({ signal }) => apiFetch<DocumentTypeDto[]>('/docs/types', { signal }),
    staleTime: 60_000,
  })
}

// Manual classification — body is either { typeId } (pick existing) or
// { name, kind } (create new).
export function useClassifyDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ docId, body }: { docId: string; body: ClassifyDocRequest }) =>
      apiPost<ClassifyDocResponse>(`/docs/${docId}/classify`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      queryClient.invalidateQueries({ queryKey: ['docs', 'types'] })
    },
  })
}

// Phase C — pending knowledge gaps captured by chat.
export function useGaps() {
  return useQuery<KbGapDto[]>({
    queryKey: ['docs', 'gaps'],
    queryFn: ({ signal }) => apiFetch<KbGapDto[]>('/docs/gaps', { signal }),
    staleTime: 15_000,
  })
}

// Phase H — top no-data queries from search analytics.
export type NoDataQuery = {
  query: string
  askCount: number
  lastAskedAt: string
}
export function useNoDataQueries() {
  return useQuery<NoDataQuery[]>({
    queryKey: ['docs', 'analytics', 'no-data'],
    queryFn: ({ signal }) =>
      apiFetch<NoDataQuery[]>('/docs/analytics/no-data-queries', { signal }),
    staleTime: 60_000,
  })
}

export function useAnswerGap() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) =>
      apiPost<CreateDocResponse>(`/docs/gaps/${id}/answer`, { answer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      queryClient.invalidateQueries({ queryKey: ['docs', 'gaps'] })
    },
  })
}

export function useDeleteGap() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const requestId = crypto.randomUUID()
      const res = await fetch(API_URL + `/docs/gaps/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['docs', 'gaps'] })
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
