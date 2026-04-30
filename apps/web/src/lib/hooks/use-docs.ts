'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateDocRequestDto as CreateDocRequest,
  CreateDocResponseDto as CreateDocResponse,
  DocDetailDto as DocDetail,
  DocListItemDto as DocListItem,
  DocumentTypeDto,
  DocumentTypeDtoKind as DocumentTypeKind,
  KbGapDto,
} from '@/generated/api'
import type { ApiErrorResponse } from '@/lib/api-errors'

// Body types not regenerated as standalone (the classify endpoint uses a
// z.union body, the accept-type endpoint shares DocumentTypeDto for output).
type AcceptTypeResponse = DocumentTypeDto
type ClassifyDocResponse = DocumentTypeDto
type ClassifyDocRequest =
  | { typeId: string }
  | { name: string; kind: DocumentTypeKind }
import { API_URL, ApiError, apiFetch, apiPost } from '@/lib/api-client'

export function useDocs() {
  return useQuery<DocListItem[]>({
    queryKey: ['docs'],
    queryFn: ({ signal }) => apiFetch<DocListItem[]>('/docs', { signal }),
    staleTime: 30_000,
    // Live updates arrive over the realtime socket (see useKbSocket). The
    // socket invalidates this query when the API emits doc.updated, so we
    // don't poll. If the socket is disconnected, the user will get fresh
    // data on the next route mount via React Query's standard staleTime.
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
    // Optimistic clear of pendingTypeProposal so the inbox card disappears
    // immediately. The actual documentType + status flip arrives via the
    // realtime socket once the AI work completes.
    onMutate: async ({ docId, kind, name }) => {
      await queryClient.cancelQueries({ queryKey: ['docs'] })
      const prev = queryClient.getQueryData<DocListItem[]>(['docs'])
      queryClient.setQueryData<DocListItem[]>(['docs'], (rows) =>
        rows?.map((d) =>
          d.id === docId
            ? {
                ...d,
                pendingTypeProposal: null,
                processingStatus: kind === 'procedural' ? 'processing' : d.processingStatus,
                documentType:
                  d.documentType ??
                  ({
                    id: 'optimistic',
                    name: name ?? d.pendingTypeProposal?.name ?? 'Saving…',
                    description: null,
                    schema: {},
                    kind: kind ?? d.pendingTypeProposal?.kind ?? 'reference',
                  } as DocListItem['documentType']),
              }
            : d,
        ),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['docs'], ctx.prev)
    },
    onSettled: () => {
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
    onMutate: async (docId) => {
      await queryClient.cancelQueries({ queryKey: ['docs'] })
      const prev = queryClient.getQueryData<DocListItem[]>(['docs'])
      queryClient.setQueryData<DocListItem[]>(['docs'], (rows) =>
        rows?.map((d) => (d.id === docId ? { ...d, pendingTypeProposal: null } : d)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['docs'], ctx.prev)
    },
    onSettled: () => {
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

// AI suggest-name button in the classify modal's "Create new" tab.
export type CategorySuggestion = {
  name: string
  kind: DocumentTypeKind
  description: string | null
  existing: boolean
}

export function useSuggestCategory() {
  return useMutation({
    mutationFn: (docId: string) =>
      apiFetch<CategorySuggestion>(`/docs/${docId}/category-suggestion`),
  })
}

// "Search KB" button on a gap card — returns top KB hits for the gap's question.
export type GapKbMatch = {
  docId: string
  title: string | null
  snippet: string
  similarity: number
}

export function useGapKbMatches() {
  return useMutation({
    mutationFn: (gapId: string) =>
      apiFetch<GapKbMatch[]>(`/docs/gaps/${gapId}/kb-matches`),
  })
}

// Manual classification — body is either { typeId } (pick existing) or
// { name, kind } (create new).
export function useClassifyDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ docId, body }: { docId: string; body: ClassifyDocRequest }) =>
      apiPost<ClassifyDocResponse>(`/docs/${docId}/classify`, body),
    // Optimistic placeholder so the inbox card disappears immediately. The
    // realtime socket pushes the canonical state once the API write lands.
    onMutate: async ({ docId, body }) => {
      await queryClient.cancelQueries({ queryKey: ['docs'] })
      const prev = queryClient.getQueryData<DocListItem[]>(['docs'])
      const isCreate = !('typeId' in body)
      const optimisticKind: DocumentTypeKind = isCreate
        ? body.kind
        : 'reference'
      queryClient.setQueryData<DocListItem[]>(['docs'], (rows) =>
        rows?.map((d) =>
          d.id === docId
            ? {
                ...d,
                pendingTypeProposal: null,
                processingStatus:
                  optimisticKind === 'procedural' ? 'processing' : d.processingStatus,
                documentType:
                  d.documentType ??
                  ({
                    id: 'optimistic',
                    name: isCreate ? body.name : 'Saving…',
                    description: null,
                    schema: {},
                    kind: optimisticKind,
                  } as DocListItem['documentType']),
              }
            : d,
        ),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['docs'], ctx.prev)
    },
    onSettled: () => {
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['docs', 'gaps'] })
      const prev = queryClient.getQueryData<KbGapDto[]>(['docs', 'gaps'])
      queryClient.setQueryData<KbGapDto[]>(['docs', 'gaps'], (rows) =>
        rows?.filter((g) => g.id !== id),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['docs', 'gaps'], ctx.prev)
    },
    onSettled: () => {
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['docs'] })
      const prev = queryClient.getQueryData<DocListItem[]>(['docs'])
      queryClient.setQueryData<DocListItem[]>(['docs'], (rows) =>
        rows?.filter((d) => d.id !== id),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['docs'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}

export type UpdateDocBody = {
  title?: string
  venueId?: string | null
  description?: string
}

export function useUpdateDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; body: UpdateDocBody }): Promise<void> => {
      const requestId = crypto.randomUUID()
      const res = await fetch(API_URL + `/docs/${args.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-request-id': requestId,
        },
        body: JSON.stringify(args.body),
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      queryClient.invalidateQueries({ queryKey: ['docs', variables.id] })
    },
  })
}
