'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { VenueDetailDto } from '@/generated/api'
import { API_URL, type ApiError, apiFetch, apiPost } from '../api-client'

/// Provider catalog the UI surfaces. Today: just Square. Adding a new
/// provider tomorrow is a single entry here + the backend module — the rest
/// of the UI fans out automatically (each provider gets a card).
export const INTEGRATION_PROVIDERS = [
  {
    id: 'square',
    label: 'Square',
    domain: 'pos',
    description:
      'Point of sale — live catalog prices, inventory counts, sales summaries, and recent orders.',
    docsHref: 'https://developer.squareup.com/apps',
    tokenHelp:
      'Generate a personal access token at developer.squareup.com → Applications → your app → Sandbox/Production Access Token.',
    supportsEnvironment: true,
  },
] as const

export type IntegrationProviderMeta = (typeof INTEGRATION_PROVIDERS)[number]

export type IntegrationSummary = {
  provider: string
  status: 'active' | 'disconnected' | 'error'
  authMode: 'pat' | 'oauth'
  environment: string
  scopes: string[]
  externalAccountId: string | null
  lastError: string | null
  lastSyncedAt: string | null
  connectedAt: string
}

export type SquareLocation = {
  id: string
  name: string | null
  status: string | null
  type: string | null
  currency: string | null
  timezone: string | null
  address: string | null
}

const LIST_KEY = ['integrations', 'list'] as const
const SQUARE_LOCATIONS_KEY = ['integrations', 'square', 'locations'] as const

export function useIntegrations() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: ({ signal }) =>
      apiFetch<{ integrations: IntegrationSummary[] }>('/integrations', { signal }),
    staleTime: 30_000,
  })
}

export function useSquareLocations(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: SQUARE_LOCATIONS_KEY,
    queryFn: ({ signal }) =>
      apiFetch<{ locations: SquareLocation[]; error: string | null }>(
        '/integrations/square/locations',
        { signal },
      ),
    enabled: opts?.enabled ?? true,
    staleTime: 60_000,
    /// Cheap retry guard — listLocations returns { error: 'No POS …' } when
    /// not connected; surface that without spamming the endpoint.
    retry: false,
  })
}

export function useConnectIntegrationPat() {
  const qc = useQueryClient()
  return useMutation<
    { integration: IntegrationSummary },
    ApiError,
    {
      provider: string
      accessToken: string
      environment?: 'production' | 'sandbox'
    }
  >({
    mutationFn: async (input) => {
      const { provider, ...body } = input
      return apiPost<{ integration: IntegrationSummary }>(
        `/integrations/${provider}/connect-pat`,
        body,
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
    },
  })
}

export function useDisconnectIntegration() {
  const qc = useQueryClient()
  return useMutation<void, ApiError, { provider: string }>({
    mutationFn: async ({ provider }) => {
      const res = await fetch(`${API_URL}/integrations/${provider}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok && res.status !== 204) {
        throw new Error(`disconnect failed: ${res.status}`)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
    },
  })
}

export function useUpdateVenueSquareLocation() {
  const qc = useQueryClient()
  return useMutation<
    VenueDetailDto,
    ApiError,
    { venueId: string; squareLocationId: string | null }
  >({
    mutationFn: async ({ venueId, squareLocationId }) => {
      const res = await fetch(`${API_URL}/venues/${venueId}/square-location`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ squareLocationId }),
      })
      if (!res.ok) {
        throw new Error(`update failed: ${res.status}`)
      }
      return (await res.json()) as VenueDetailDto
    },
    onSuccess: (data) => {
      qc.setQueryData(['venues', data.id], data)
      qc.invalidateQueries({ queryKey: ['venues'] })
    },
  })
}
