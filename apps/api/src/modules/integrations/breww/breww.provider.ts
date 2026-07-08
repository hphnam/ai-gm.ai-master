import { Injectable, type OnModuleInit } from '@nestjs/common'
import type { z } from 'zod'
import { fail, type ToolResult } from '../../../types'
import type { DispatchContext } from '../../chat/tool-dispatcher'
import type { IntegrationProvider } from '../integration-provider'
import { IntegrationRegistry } from '../integration-registry'
import { BREWW_PROVIDER_ID, BrewwService } from './breww.service'
import {
  BREWERY_GET_PRODUCT_MARGINS,
  BREWERY_LIST_BATCHES,
  BREWERY_LIST_PRODUCTS,
  BREWERY_LIST_PURCHASE_ORDERS,
  BREWW_TOOL_DEFINITIONS,
  BREWW_TOOL_SCHEMAS,
} from './breww.tools'

/// Breww (brewery management) provider. Read-only surface: production
/// batches, packaged products, supplier purchase orders, and per-sale
/// production cost / margin — the COGS data a POS can't provide. Same
/// self-registration pattern as SquareProvider.
@Injectable()
export class BrewwProvider implements IntegrationProvider, OnModuleInit {
  readonly id = BREWW_PROVIDER_ID
  readonly label = 'Breww'
  readonly domain = 'brewery' as const
  readonly toolDefinitions = BREWW_TOOL_DEFINITIONS
  readonly toolSchemas: Readonly<Record<string, z.ZodTypeAny>> = BREWW_TOOL_SCHEMAS

  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly breww: BrewwService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this)
  }

  /// Breww keys are production-only (no sandbox) — the environment arg from
  /// the generic connect flow is intentionally ignored.
  async validateCredentials(input: {
    accessToken: string
    environment: 'production' | 'sandbox'
  }): Promise<{ externalAccountId: string | null; scopes?: string[] }> {
    return this.breww.validatePat(input.accessToken)
  }

  async dispatch(
    toolName: string,
    input: unknown,
    ctx: DispatchContext,
  ): Promise<ToolResult<unknown>> {
    switch (toolName) {
      case BREWERY_LIST_BATCHES: {
        const i = input as { status?: 'planned' | 'in-progress' | 'complete'; limit?: number }
        return this.breww.listBatches(ctx.orgId, i)
      }
      case BREWERY_LIST_PRODUCTS: {
        const i = input as { query?: string; limit?: number }
        return this.breww.listProducts(ctx.orgId, i)
      }
      case BREWERY_LIST_PURCHASE_ORDERS: {
        const i = input as { sinceDays?: number; limit?: number }
        return this.breww.listPurchaseOrders(ctx.orgId, i)
      }
      case BREWERY_GET_PRODUCT_MARGINS: {
        const i = input as { productQuery?: string; limit?: number }
        return this.breww.getProductMargins(ctx.orgId, i)
      }
      default:
        return fail('not-supported', `Unknown Breww tool: ${toolName}`)
    }
  }
}
