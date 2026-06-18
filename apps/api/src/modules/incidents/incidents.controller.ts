import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { CurrentOrg, CurrentUser, RequireRole } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import { RoleGuard } from '../auth/role.guard'
import {
  ComposeIncidentCommentBodyDto,
  IncidentCommentParamDto,
  IncidentIdParamDto,
  ListIncidentCommentsResponseDto,
  ListIncidentsQueryDto,
  ListIncidentsResponseDto,
  SingleIncidentCommentResponseDto,
  SingleIncidentResponseDto,
  UpdateIncidentStatusBodyDto,
} from './dto/incidents.dto'
import { IncidentsService } from './incidents.service'

@ApiTags('incidents')
@ApiBearerAuth()
@Controller('incidents')
@UseGuards(AuthGuard, RoleGuard)
@RequireRole('owner', 'manager')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  @Get()
  @ApiResponse({ status: 200, type: ListIncidentsResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @Query(new ZodValidationPipe(ListIncidentsQueryDto)) query: ListIncidentsQueryDto,
  ): Promise<ListIncidentsResponseDto> {
    return this.service.list(org.id, {
      status: query.status,
      severity: query.severity,
      venueId: query.venueId,
      limit: query.limit,
    })
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: SingleIncidentResponseDto })
  async getOne(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(IncidentIdParamDto)) params: IncidentIdParamDto,
  ): Promise<SingleIncidentResponseDto> {
    const incident = await this.service.getOne(org.id, params.id)
    return { incident }
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: SingleIncidentResponseDto })
  async updateStatus(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(IncidentIdParamDto)) params: IncidentIdParamDto,
    @Body(new ZodValidationPipe(UpdateIncidentStatusBodyDto)) body: UpdateIncidentStatusBodyDto,
  ): Promise<SingleIncidentResponseDto> {
    const incident = await this.service.updateStatus(
      org.id,
      params.id,
      body.status,
      user.id,
      body.resolution,
    )
    return { incident }
  }

  @Get(':id/comments')
  @ApiResponse({ status: 200, type: ListIncidentCommentsResponseDto })
  async listComments(
    @CurrentOrg() org: { id: string },
    @Param(new ZodValidationPipe(IncidentIdParamDto)) params: IncidentIdParamDto,
  ): Promise<ListIncidentCommentsResponseDto> {
    const comments = await this.service.listComments(org.id, params.id)
    return { comments }
  }

  @Post(':id/comments')
  @HttpCode(201)
  @ApiResponse({ status: 201, type: SingleIncidentCommentResponseDto })
  async addComment(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(IncidentIdParamDto)) params: IncidentIdParamDto,
    @Body(new ZodValidationPipe(ComposeIncidentCommentBodyDto))
    body: ComposeIncidentCommentBodyDto,
  ): Promise<SingleIncidentCommentResponseDto> {
    const comment = await this.service.addComment(org.id, params.id, user.id, body.body)
    return { comment }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async deleteOne(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(IncidentIdParamDto)) params: IncidentIdParamDto,
  ): Promise<void> {
    await this.service.deleteOne(org.id, params.id, user.id)
  }

  @Delete(':id/comments/:commentId')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async deleteComment(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(IncidentCommentParamDto)) params: IncidentCommentParamDto,
  ): Promise<void> {
    await this.service.deleteComment({
      orgId: org.id,
      incidentId: params.id,
      commentId: params.commentId,
      actorUserId: user.id,
    })
  }
}
