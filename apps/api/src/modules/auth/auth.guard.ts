import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import type { ApiErrorResponse } from '../../types'

export type AuthedRequest = Request & {
  requestId?: string
  user?: { id: string; email: string; name: string | null }
  session?: { id: string; token: string; activeOrganizationId: string | null }
  organization?: { id: string; name: string; slug: string }
  membership?: { role: string; venueIds: string[] }
}

// OrgContextMiddleware runs globally before every guard and resolves the
// session (one getSession/request) onto req. This guard just asserts the route
// requires an authenticated user — no second session lookup.
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    if (!req.user) {
      const body: ApiErrorResponse = { error: 'unauthorized' }
      throw new UnauthorizedException(body)
    }
    return true
  }
}
