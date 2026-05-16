'use client'

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
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

// Server-driven library filters. Keep in sync with apps/api DocListQuerySchema.
export type DocsFilters = {
  q?: string
  category?: 'all' | 'unclassified' | string
  venue?: 'all' | 'global' | string
  status?: 'all' | 'ready' | 'processing' | 'attention'
  sort?: 'recent' | 'oldest' | 'name'
}

export type DocListPage = {
  items: DocListItem[]
  nextCursor: string | null
  total: number
}

const DEFAULT_FILTERS: Required<Omit<DocsFilters, 'q'>> & { q: string } = {
  q: '',
  category: 'all',
  venue: 'all',
  status: 'all',
  sort: 'recent',
}

function normaliseFilters(f: DocsFilters | undefined) {
  return {
    q: (f?.q ?? '').trim(),
    category: f?.category ?? DEFAULT_FILTERS.category,
    venue: f?.venue ?? DEFAULT_FILTERS.venue,
    status: f?.status ?? DEFAULT_FILTERS.status,
    sort: f?.sort ?? DEFAULT_FILTERS.sort,
  }
}

function buildDocsQs(filters: ReturnType<typeof normaliseFilters>, cursor: string | null) {
  const sp = new URLSearchParams()
  if (filters.q) sp.set('q', filters.q)
  if (filters.category !== 'all') sp.set('category', filters.category)
  if (filters.venue !== 'all') sp.set('venue', filters.venue)
  if (filters.status !== 'all') sp.set('status', filters.status)
  if (filters.sort !== 'recent') sp.set('sort', filters.sort)
  if (cursor) sp.set('cursor', cursor)
  sp.set('limit', '20')
  const s = sp.toString()
  return s ? `?${s}` : ''
}

// Body types not regenerated as standalone (the classify endpoint uses a
// z.union body, the accept-type endpoint shares DocumentTypeDto for output).
type AcceptTypeResponse = DocumentTypeDto
type ClassifyDocResponse = DocumentTypeDto
type ClassifyDocRequest = { typeId: string } | { name: string; kind: DocumentTypeKind }

import { API_URL, ApiError, apiFetch, apiPost } from '@/lib/api-client'

// Paginated server-side library list. Filters / search / sort all live in
// the query key so React Query caches each combination separately. Realtime
// (useKbSocket) invalidates the entire ['docs'] prefix, so cross-filter
// caches refresh on doc.updated without needing a single shared cache.
export function useDocs(filters?: DocsFilters) {
  const norm = normaliseFilters(filters)
  return useInfiniteQuery<
    DocListPage,
    Error,
    InfiniteData<DocListPage>,
    readonly unknown[],
    string | null
  >({
    queryKey: ['docs', 'list', norm] as const,
    queryFn: ({ signal, pageParam }) =>
      apiFetch<DocListPage>(`/docs${buildDocsQs(norm, pageParam ?? null)}`, {
        signal,
      }),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  })
}

// Inbox: small flat list of attention-needed rows. Not paginated — capped
// server-side. Used by the Inbox tab + the inbox count badge.
export function useInbox() {
  return useQuery<DocListItem[]>({
    queryKey: ['docs', 'inbox'],
    queryFn: ({ signal }) => apiFetch<DocListItem[]>('/docs/inbox', { signal }),
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
    mutationFn: (body: CreateDocRequest) => apiPost<CreateDocResponse>('/docs', body),
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
      // When true AND no venueId is set, the server runs the classifier with
      // the org's venue list and auto-assigns above the confidence threshold.
      autoDetectVenue?: boolean
    }): Promise<CreateDocResponse> => {
      const requestId = crypto.randomUUID()
      const form = new FormData()
      form.append('file', args.file)
      if (args.venueId) form.append('venueId', args.venueId)
      if (args.title?.trim()) form.append('title', args.title.trim())
      if (args.description?.trim()) form.append('description', args.description.trim())
      if (args.autoDetectVenue) form.append('autoDetectVenue', 'true')
      const res = await fetch(`${API_URL}/docs/upload`, {
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
    // Optimistic clear on the inbox cache so the card disappears immediately.
    // The library list invalidates on settle — no per-page mutation needed.
    onMutate: async ({ docId }) => {
      await queryClient.cancelQueries({ queryKey: ['docs', 'inbox'] })
      const prev = queryClient.getQueryData<DocListItem[]>(['docs', 'inbox'])
      queryClient.setQueryData<DocListItem[]>(['docs', 'inbox'], (rows) =>
        rows?.filter((d) => d.id !== docId),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['docs', 'inbox'], ctx.prev)
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
      const res = await fetch(`${API_URL}/docs/${docId}/reject-type`, {
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
      // Reject leaves the row in the inbox under "Need a category" — clear
      // the proposal optimistically so the AI-suggestion card disappears.
      await queryClient.cancelQueries({ queryKey: ['docs', 'inbox'] })
      const prev = queryClient.getQueryData<DocListItem[]>(['docs', 'inbox'])
      queryClient.setQueryData<DocListItem[]>(['docs', 'inbox'], (rows) =>
        rows?.map((d) => (d.id === docId ? { ...d, pendingTypeProposal: null } : d)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['docs', 'inbox'], ctx.prev)
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
    mutationFn: (gapId: string) => apiFetch<GapKbMatch[]>(`/docs/gaps/${gapId}/kb-matches`),
  })
}

// Manual classification — body is either { typeId } (pick existing) or
// { name, kind } (create new).
export function useClassifyDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ docId, body }: { docId: string; body: ClassifyDocRequest }) =>
      apiPost<ClassifyDocResponse>(`/docs/${docId}/classify`, body),
    // Optimistic removal from the inbox — manual-classify always resolves the
    // "needs a category" state. Library cache invalidates on settle.
    onMutate: async ({ docId }) => {
      await queryClient.cancelQueries({ queryKey: ['docs', 'inbox'] })
      const prev = queryClient.getQueryData<DocListItem[]>(['docs', 'inbox'])
      queryClient.setQueryData<DocListItem[]>(['docs', 'inbox'], (rows) =>
        rows?.filter((d) => d.id !== docId),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['docs', 'inbox'], ctx.prev)
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
    queryFn: ({ signal }) => apiFetch<NoDataQuery[]>('/docs/analytics/no-data-queries', { signal }),
    staleTime: 60_000,
  })
}

// Drop a query from the no-data panel optimistically — used by both promote
// and dismiss so a row vanishes immediately without waiting for the refetch.
function removeNoDataQuery(
  queryClient: ReturnType<typeof useQueryClient>,
  query: string,
): NoDataQuery[] | undefined {
  const key = ['docs', 'analytics', 'no-data']
  const prev = queryClient.getQueryData<NoDataQuery[]>(key)
  if (prev) {
    queryClient.setQueryData<NoDataQuery[]>(
      key,
      prev.filter((q) => q.query !== query),
    )
  }
  return prev
}

export function usePromoteNoDataQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (query: string) =>
      apiPost<{ gapId: string; askCount: number; dedupedFromExisting: boolean }>(
        '/docs/analytics/no-data-queries/promote',
        { query },
      ),
    onMutate: async (query) => {
      await queryClient.cancelQueries({ queryKey: ['docs', 'analytics', 'no-data'] })
      const prev = removeNoDataQuery(queryClient, query)
      return { prev }
    },
    onError: (_err, _query, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['docs', 'analytics', 'no-data'], ctx.prev)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs', 'gaps'] })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['docs', 'analytics', 'no-data'] })
    },
  })
}

export function useDismissNoDataQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (query: string): Promise<void> => {
      const requestId = crypto.randomUUID()
      const res = await fetch(`${API_URL}/docs/analytics/no-data-queries/dismiss`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify({ query }),
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
    onMutate: async (query) => {
      await queryClient.cancelQueries({ queryKey: ['docs', 'analytics', 'no-data'] })
      const prev = removeNoDataQuery(queryClient, query)
      return { prev }
    },
    onError: (_err, _query, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['docs', 'analytics', 'no-data'], ctx.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['docs', 'analytics', 'no-data'] })
    },
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
      const res = await fetch(`${API_URL}/docs/gaps/${id}`, {
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
      const res = await fetch(`${API_URL}/docs/${id}`, {
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
      // Cancel both inbox + every cached library page, snapshot, then strip
      // the row from each cache. setQueriesData with a queryKey prefix hits
      // every filter combination the user has visited this session.
      await queryClient.cancelQueries({ queryKey: ['docs'] })
      const prevInbox = queryClient.getQueryData<DocListItem[]>(['docs', 'inbox'])
      const prevLibrary = queryClient.getQueriesData<InfiniteData<DocListPage>>({
        queryKey: ['docs', 'list'],
      })
      queryClient.setQueryData<DocListItem[]>(['docs', 'inbox'], (rows) =>
        rows?.filter((d) => d.id !== id),
      )
      queryClient.setQueriesData<InfiniteData<DocListPage>>(
        { queryKey: ['docs', 'list'] },
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((p) => ({
                  ...p,
                  items: p.items.filter((d) => d.id !== id),
                  total: Math.max(0, p.total - (p.items.some((d) => d.id === id) ? 1 : 0)),
                })),
              }
            : data,
      )
      return { prevInbox, prevLibrary }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevInbox) queryClient.setQueryData(['docs', 'inbox'], ctx.prevInbox)
      if (ctx?.prevLibrary) {
        for (const [key, data] of ctx.prevLibrary) {
          queryClient.setQueryData(key, data)
        }
      }
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
      const res = await fetch(`${API_URL}/docs/${args.id}`, {
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
