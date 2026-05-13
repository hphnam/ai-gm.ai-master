import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { fromNodeHeaders } from 'better-auth/node'
import type { Request } from 'express'
import type { ApiErrorResponse } from '../../types'
import { auth } from './auth.config'

export type AuthedRequest = Request & {
  requestId?: string
  user?: { id: string; email: string; name: string | null }
  session?: { id: string; token: string; activeOrganizationId: string | null }
  organization?: { id: string; name: string; slug: string }
  membership?: { role: string }
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const headers = fromNodeHeaders(req.headers)
    const result = await auth.api.getSession({ headers })
    if (!result?.user || !result?.session) {
      const body: ApiErrorResponse = { error: 'unauthorized' }
      throw new UnauthorizedException(body)
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
    return true
  }
}
