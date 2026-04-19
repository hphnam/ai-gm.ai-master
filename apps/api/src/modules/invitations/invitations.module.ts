import { Module } from '@nestjs/common'
import { InvitationsController } from './invitations.controller'
import { InvitationsService } from './invitations.service'
import { MailService } from './mail.service'

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService, MailService],
  exports: [],
})
export class InvitationsModule {}
