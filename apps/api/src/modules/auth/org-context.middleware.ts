import { Injectable, Logger, type NestMiddleware, NotFoundException } from '@nestjs/common'
import { fromNodeHeaders } from 'better-auth/node'
import type { NextFunction, Response } from 'express'
import { prisma } from '../../database/prisma'
import type { ApiErrorResponse } from '../../types'
import { auth } from './auth.config'
import type { AuthedRequest } from './auth.guard'

const AUTH_PREFIX = '/api/auth'

@Injectable()
export class OrgContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('OrgContextMiddleware')

  async use(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
    // Never touch better-auth's own endpoints.
    if (req.path.startsWith(AUTH_PREFIX)) return next()

    const headers = fromNodeHeaders(req.headers)
    const result = await auth.api.getSession({ headers }).catch(() => null)
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

    const preferredOrgId = req.session.activeOrganizationId
    const membership = preferredOrgId
      ? await prisma.organizationMember.findFirst({
          where: { userId: req.user.id, organizationId: preferredOrgId },
          select: {
            role: true,
            organizationId: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        })
      : await prisma.organizationMember.findFirst({
          where: { userId: req.user.id },
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            organizationId: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        })

    if (!membership) {
      const body: ApiErrorResponse = { error: 'organization-not-found' }
      throw new NotFoundException(body)
    }

    req.organization = membership.organization
    req.membership = { role: membership.role }

    this.logger.log(
      JSON.stringify({
        event: 'auth.org_resolved',
        requestId: req.requestId ?? null,
        userId: req.user.id,
        orgId: membership.organizationId,
        role: membership.role,
      }),
    )

    next()
  }
}
