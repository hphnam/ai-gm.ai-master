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

export const REQUIRE_ROLE_KEY = 'requireRole'
export const RequireRole = (...roles: Role[]) => SetMetadata(REQUIRE_ROLE_KEY, roles)
