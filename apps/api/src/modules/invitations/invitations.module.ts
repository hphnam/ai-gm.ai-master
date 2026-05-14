import { Module } from '@nestjs/common'
import { InvitationsController } from './invitations.controller'
import { InvitationsService } from './invitations.service'
import { MailService } from './mail.service'
import { OrgMembersController } from './members.controller'

@Module({
  controllers: [InvitationsController, OrgMembersController],
  providers: [InvitationsService, MailService],
  exports: [],
})
export class InvitationsModule {}
