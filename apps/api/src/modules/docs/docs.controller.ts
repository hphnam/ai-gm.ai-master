import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import {
  CreateDocRequestSchema,
  UUID_RE,
  type ApiErrorResponse,
  type CreateDocRequest,
  type CreateDocResponse,
  type DocDetail,
  type DocListItem,
} from '@gm-ai/types'
import { zodPipe } from '../../common/zod-pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentOrg, RequireRole } from '../auth/auth.decorators'
import { RoleGuard } from '../auth/role.guard'
import { DocNotFoundOrCrossOrgError, DocsService } from './docs.service'

const DocIdParamSchema = z.object({
  id: z.string().regex(UUID_RE, 'invalid uuid'),
})

@Controller('docs')
@UseGuards(AuthGuard, RoleGuard)
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Get()
  list(@CurrentOrg() org: { id: string }): Promise<DocListItem[]> {
    return this.docsService.list(org.id)
  }

  @Get(':id')
  async get(
    @Param(zodPipe(DocIdParamSchema)) params: { id: string },
    @CurrentOrg() org: { id: string },
  ): Promise<DocDetail> {
    const doc = await this.docsService.getById(params.id, org.id)
    if (!doc) {
      throw new NotFoundException({ error: 'not-found' } satisfies ApiErrorResponse)
    }
    return doc
  }

  @Post()
  @HttpCode(200)
  @RequireRole('owner', 'manager')
  async create(
    @Body(zodPipe(CreateDocRequestSchema)) body: CreateDocRequest,
    @CurrentOrg() org: { id: string },
  ): Promise<CreateDocResponse> {
    try {
      return await this.docsService.create(body, org.id)
    } catch (err) {
      if (err instanceof DocNotFoundOrCrossOrgError) {
        throw new NotFoundException({ error: 'venue-not-found' } satisfies ApiErrorResponse)
      }
      throw err
    }
  }
}
