/// Shared query specs — the single source of truth for a GET's React Query key
/// and its API path. Imported by BOTH the client hooks (which fetch via
/// `apiFetch`) and the server prefetch (which fetches via `serverApiFetch`), so
/// a server-hydrated query and its client hook can never drift on the key.
///
/// This module has NO 'use client' directive on purpose: it holds only plain
/// data, so a server component can read the actual values (a 'use client'
/// module would hand the server client-reference proxies instead).

export type QuerySpec = { queryKey: readonly unknown[]; path: string }

export const orgProfileQuery = { queryKey: ['org-profile'], path: '/org/profile' } as const
export const orgMembersQuery = { queryKey: ['org-members'], path: '/org/members' } as const
export const invitationsQuery = { queryKey: ['invitations'], path: '/org/invitations' } as const
export const whatsappInvitesQuery = {
  queryKey: ['whatsapp-invites'],
  path: '/whatsapp/invites',
} as const
export const integrationsListQuery = {
  queryKey: ['integrations', 'list'],
  path: '/integrations',
} as const
export const phoneStatusQuery = {
  queryKey: ['phone', 'status'],
  path: '/auth/phone/status',
} as const
export const venuesListQuery = { queryKey: ['venues'], path: '/venues' } as const
