import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { OrgContextMiddleware } from './org-context.middleware'
import { RoleGuard } from './role.guard'

@Module({
  controllers: [AuthController],
  providers: [AuthGuard, RoleGuard, OrgContextMiddleware],
  exports: [AuthGuard, RoleGuard, OrgContextMiddleware],
})
export class AuthModule {}
