import { Injectable, Logger, type NestMiddleware, NotFoundException } from '@nestjs/common'
import { fromNodeHeaders } from 'better-auth/node'
import type { NextFunction, Response } from 'express'
import { runWithVenueContext } from '../../database/venue-context'
import type { ApiErrorResponse, Role } from '../../types'
import { auth, type SessionOrgContext } from './auth.config'
import type { AuthedRequest } from './auth.guard'

const AUTH_PREFIX = '/api/auth'

@Injectable()
export class OrgContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('OrgContextMiddleware')

  async use(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
    // Never touch better-auth's own endpoints.
    if (req.path.startsWith(AUTH_PREFIX)) return next()

    const headers = fromNodeHeaders(req.headers)
    // getSession also runs the customSession membership query. Log failures so a
    // DB/infra error surfaces instead of silently masking as an unauthenticated
    // request (the null path below falls through to AuthGuard's 401).
    const result = await auth.api.getSession({ headers }).catch((err) => {
      this.logger.error(
        JSON.stringify({
          event: 'auth.get_session_failed',
          requestId: req.requestId ?? null,
          message: (err as Error)?.message ?? 'unknown',
        }),
      )
      return null
    })
    if (!result?.user || !result?.session) {
      // AuthGuard (if mounted on the route) will decide whether to 401.
      // Public routes (e.g. /app health) pass through.
      return next()
    }

    req.user = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name ?? null,
    }
    req.session = {
      id: result.session.id,
      token: result.session.token,
      activeOrganizationId:
        (result.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null,
    }

    // Active org + role now ride on the session (customSession plugin), so no
    // second query here — one getSession per request resolves everything.
    const enriched = result as unknown as SessionOrgContext
    if (!enriched.membership || !enriched.activeOrganization) {
      const body: ApiErrorResponse = { error: 'organization-not-found' }
      throw new NotFoundException(body)
    }

    req.organization = enriched.activeOrganization
    req.membership = {
      role: enriched.membership.role,
      venueIds: enriched.membership.venueIds ?? [],
    }

    this.logger.log(
      JSON.stringify({
        event: 'auth.org_resolved',
        requestId: req.requestId ?? null,
        userId: req.user.id,
        orgId: enriched.activeOrganization.id,
        role: enriched.membership.role,
      }),
    )

    // Run the rest of the request inside the venue-scope store so every DB query
    // this member makes is auto-narrowed to their accessible venues (the Prisma
    // extension is a no-op for owners / unscoped members).
    runWithVenueContext(
      { role: req.membership.role as Role, venueIds: req.membership.venueIds },
      () => next(),
    )
  }
}
