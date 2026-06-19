import { Injectable, type OnModuleInit } from '@nestjs/common'
import type { z } from 'zod'
import type { ToolResult } from '../../types'
import type { DispatchContext } from '../chat/tool-dispatcher'
import type { IntegrationProvider } from '../integrations/integration-provider'
import { IntegrationRegistry } from '../integrations/integration-registry'
import { BrainService } from './brain.service'
import { BRAIN_TOOL_DEFINITIONS, BRAIN_TOOL_SCHEMAS } from './brain.tools'

export const BRAIN_PROVIDER_ID = 'brain'

/// BrainProvider self-registers with IntegrationRegistry on module init — the
/// same seam SquareProvider uses (new file → register → tools available; no
/// edits to chat-tools.ts). domain='other' so it never collides with a POS,
/// accounting, or CRM provider. The brain is always-on infrastructure, so there
/// is no connect-UI / validateCredentials flow; an active Integration row
/// (seed-brain.sql) lets resolveActiveProvider return it at dispatch time.
@Injectable()
export class BrainProvider implements IntegrationProvider, OnModuleInit {
  readonly id = BRAIN_PROVIDER_ID
  readonly label = 'Proactive Brain'
  readonly domain = 'other' as const
  readonly toolDefinitions = BRAIN_TOOL_DEFINITIONS
  readonly toolSchemas: Readonly<Record<string, z.ZodTypeAny>> = BRAIN_TOOL_SCHEMAS

  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly service: BrainService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this)
  }

  dispatch(toolName: string, input: unknown, ctx: DispatchContext): Promise<ToolResult<unknown>> {
    return this.service.dispatch(toolName, input, ctx)
  }
}
