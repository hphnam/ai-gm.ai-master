import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common'
import type { Role } from '../../types'
import type { AuthedRequest } from './auth.guard'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().user,
)

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthedRequest>().organization,
)

export const CurrentRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthedRequest>().membership?.role,
)

// Full venue scope for the active membership — { role, venueIds }. Feed to
// venue-scope.ts helpers (canAccessVenue / resolveAccessibleVenueIds). Defaults
// to an all-access staff scope when no membership resolved (guards still gate).
export const CurrentVenueScope = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const m = ctx.switchToHttp().getRequest<AuthedRequest>().membership
  return { role: (m?.role ?? 'staff') as Role, venueIds: m?.venueIds ?? [] }
})

export const REQUIRE_ROLE_KEY = 'requireRole'
export const RequireRole = (...roles: Role[]) => SetMetadata(REQUIRE_ROLE_KEY, roles)
