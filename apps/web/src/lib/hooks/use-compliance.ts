'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiPost } from '@/lib/api-client'

export type ExpiryStatus = 'active' | 'renewed' | 'expired' | 'dismissed'

export const COMPLIANCE_CATEGORIES = [
  'food_hygiene',
  'personal_licence',
  'premises_licence',
  'pat',
  'gas_safety',
  'fire_risk',
  'insurance',
  'equipment_service',
  'other',
] as const

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  food_hygiene: 'Food hygiene',
  personal_licence: 'Personal licence',
  premises_licence: 'Premises licence',
  pat: 'PAT testing',
  gas_safety: 'Gas safety',
  fire_risk: 'Fire risk assessment',
  insurance: 'Insurance',
  equipment_service: 'Equipment service',
  other: 'Other',
}

export type ExpiryRecord = {
  id: string
  organizationId: string
  venueId: string | null
  knowledgeItemId: string | null
  title: string
  category: string
  expiresAt: string
  personUserId: string | null
  personName: string | null
  assetName: string | null
  renewalCostGbp: number | null
  status: ExpiryStatus
  reminded30At: string | null
  reminded7At: string | null
  reminded1At: string | null
  remindedOverdueAt: string | null
  extractionConfidence: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ListExpiryRecordsResponse = {
  records: ExpiryRecord[]
  activeCount: number
  overdueCount: number
  within30dCount: number
}

const LIST_KEY = (status: string) => ['compliance', 'list', { status }] as const
const SUMMARY_KEY = ['compliance', 'summary'] as const

export function useExpiryRecords(opts?: {
  status?: 'active' | 'renewed' | 'expired' | 'dismissed' | 'all'
  enabled?: boolean
}) {
  const status = opts?.status ?? 'active'
  return useQuery<ListExpiryRecordsResponse>({
    queryKey: LIST_KEY(status),
    queryFn: ({ signal }) =>
      apiFetch<ListExpiryRecordsResponse>(`/compliance/expiry-records?status=${status}&limit=200`, {
        signal,
      }),
    enabled: opts?.enabled ?? true,
    staleTime: 30_000,
  })
}

/// Lightweight sidebar / dashboard counts. Hits the same endpoint with limit=1
/// so we just trust the counts in the response — React Query dedupes against
/// any concurrent useExpiryRecords call.
export function useExpiryCounts() {
  return useQuery<{ activeCount: number; overdueCount: number; within30dCount: number }>({
    queryKey: SUMMARY_KEY,
    queryFn: async ({ signal }) => {
      const res = await apiFetch<ListExpiryRecordsResponse>(
        '/compliance/expiry-records?status=active&limit=1',
        { signal },
      )
      return {
        activeCount: res.activeCount,
        overdueCount: res.overdueCount,
        within30dCount: res.within30dCount,
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  })
}

export function useCreateExpiryRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title: string
      category: string
      expiresAt: string
      venueId?: string | null
      personUserId?: string | null
      personName?: string | null
      assetName?: string | null
      renewalCostGbp?: number | null
      notes?: string | null
    }) => apiPost<{ record: ExpiryRecord }>('/compliance/expiry-records', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance'] })
    },
  })
}

export function useUpdateExpiryRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      title?: string
      category?: string
      expiresAt?: string
      venueId?: string | null
      personUserId?: string | null
      personName?: string | null
      assetName?: string | null
      renewalCostGbp?: number | null
      status?: ExpiryStatus
      notes?: string | null
    }) => {
      const { id, ...patch } = input
      return apiFetch<{ record: ExpiryRecord }>(`/compliance/expiry-records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance'] })
    },
  })
}
