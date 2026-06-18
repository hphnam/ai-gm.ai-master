import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { ApiErrorResponse, Role } from '../../types'
import { REQUIRE_ROLE_KEY } from './auth.decorators'
import type { AuthedRequest } from './auth.guard'

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name)

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(REQUIRE_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const role = req.membership?.role as Role | undefined
    if (!role || !required.includes(role)) {
      this.logger.log(
        JSON.stringify({
          event: 'auth.role_denied',
          requestId: req.requestId ?? null,
          userId: req.user?.id ?? null,
          requiredRole: required,
          actualRole: role ?? null,
        }),
      )
      const body: ApiErrorResponse = { error: 'forbidden' }
      throw new ForbiddenException(body)
    }
    return true
  }
}
