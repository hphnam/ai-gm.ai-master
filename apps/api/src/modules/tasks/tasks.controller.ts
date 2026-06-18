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
import type { Role } from '../../types'
import { CurrentOrg, CurrentRole, CurrentUser } from '../auth/auth.decorators'
import { AuthGuard } from '../auth/auth.guard'
import {
  CreateTaskBodyDto,
  ListTasksQueryDto,
  ListTasksResponseDto,
  SingleTaskResponseDto,
  TaskIdParamDto,
  UpdateTaskBodyDto,
} from './dto/tasks.dto'
import { TasksService } from './tasks.service'

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  @ApiResponse({ status: 200, type: ListTasksResponseDto })
  async list(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(ListTasksQueryDto)) query: ListTasksQueryDto,
  ): Promise<ListTasksResponseDto> {
    return this.service.list(org.id, user.id, {
      status: query.status,
      scope: query.scope,
      venueId: query.venueId,
      limit: query.limit,
    })
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: SingleTaskResponseDto })
  async get(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(TaskIdParamDto)) params: TaskIdParamDto,
  ): Promise<SingleTaskResponseDto> {
    const task = await this.service.getById(org.id, user.id, params.id)
    return { task }
  }

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, type: SingleTaskResponseDto })
  async create(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @CurrentRole() role: Role | undefined,
    @Body(new ZodValidationPipe(CreateTaskBodyDto)) body: CreateTaskBodyDto,
  ): Promise<SingleTaskResponseDto> {
    const task = await this.service.create(org.id, user.id, {
      body: body.body,
      assigneeUserId: body.assigneeUserId ?? null,
      dueAt: body.dueAt ?? null,
      venueId: body.venueId ?? null,
      category: body.category ?? null,
      creatorRole: role ?? null,
    })
    return { task }
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: SingleTaskResponseDto })
  async update(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(TaskIdParamDto)) params: TaskIdParamDto,
    @Body(new ZodValidationPipe(UpdateTaskBodyDto)) body: UpdateTaskBodyDto,
  ): Promise<SingleTaskResponseDto> {
    const task = await this.service.update(org.id, user.id, params.id, {
      body: body.body,
      dueAt: body.dueAt,
      status: body.status,
      category: body.category,
    })
    return { task }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentOrg() org: { id: string },
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(TaskIdParamDto)) params: TaskIdParamDto,
  ): Promise<void> {
    await this.service.remove(org.id, user.id, params.id)
  }
}
