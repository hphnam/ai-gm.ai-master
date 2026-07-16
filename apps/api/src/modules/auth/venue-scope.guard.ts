import { CanActivate, type ExecutionContext, Injectable, NotFoundException } from '@nestjs/common'
import type { ApiErrorResponse } from '../../types'
import type { AuthedRequest } from './auth.guard'
import { canAccessVenue } from './venue-scope'

// Global backstop for per-member venue scoping. OrgContextMiddleware resolves
// `req.membership` (role + venueIds) before any guard runs; this guard inspects
// the request for a `venueId` access target (param → query → body) and hard-
// denies when a venue-scoped member reaches outside their allowed set. Public
// routes and unscoped members (owners, empty scope) always pass.
//
// Multipart bodies aren't parsed until the file interceptor runs (after guards),
// so the one multipart venue endpoint (chat image upload) keeps its own explicit
// check — this guard only sees already-parsed params/query/JSON body.
@Injectable()
export class VenueScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const membership = req.membership
    if (!membership) return true

    const venueId = extractVenueId(req)
    if (!venueId) return true

    if (
      !canAccessVenue({ role: membership.role as never, venueIds: membership.venueIds }, venueId)
    ) {
      throw new NotFoundException({ error: 'venue-not-found' } satisfies ApiErrorResponse)
    }
    return true
  }
}

function extractVenueId(req: AuthedRequest): string | null {
  const fromParams = (req.params as Record<string, unknown> | undefined)?.venueId
  const fromQuery = (req.query as Record<string, unknown> | undefined)?.venueId
  const body = req.body as Record<string, unknown> | undefined
  const fromBody = body && typeof body === 'object' ? body.venueId : undefined
  const candidate = fromParams ?? fromQuery ?? fromBody
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}
