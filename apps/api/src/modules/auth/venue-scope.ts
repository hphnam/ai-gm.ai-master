import type { Role } from '../../types'

// Per-member venue scoping. A member's `venueIds` is empty by default, meaning
// access to every venue in the org. A non-empty list restricts them to exactly
// those venues. Owners always resolve to all venues regardless of the field.

export type VenueScope = { role: Role; venueIds: string[] }

export function isVenueScoped(scope: VenueScope): boolean {
  return scope.role !== 'owner' && scope.venueIds.length > 0
}

export function canAccessVenue(scope: VenueScope, venueId: string): boolean {
  if (!isVenueScoped(scope)) return true
  return scope.venueIds.includes(venueId)
}

// Narrow a set of org venue ids down to the ones this member may reach.
export function resolveAccessibleVenueIds(scope: VenueScope, orgVenueIds: string[]): string[] {
  if (!isVenueScoped(scope)) return orgVenueIds
  const allowed = new Set(scope.venueIds)
  return orgVenueIds.filter((id) => allowed.has(id))
}
