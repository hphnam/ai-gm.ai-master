import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import type { z } from 'zod'
import { fail, type ToolResult } from '../../../types'
import type { DispatchContext } from '../../chat/tool-dispatcher'
import type { IntegrationProvider } from '../integration-provider'
import { IntegrationRegistry } from '../integration-registry'
import { SQUARE_PROVIDER_ID, SquareService } from './square.service'
import {
  POS_COMPARE_PERIODS,
  POS_GET_ACTIVE_SHIFTS,
  POS_GET_HOURLY_BREAKDOWN,
  POS_GET_ITEM_INVENTORY,
  POS_GET_LABOR_SUMMARY,
  POS_GET_PAYMENT_BREAKDOWN,
  POS_GET_REFUND_SUMMARY,
  POS_GET_SALES_SUMMARY,
  POS_GET_TOP_ITEMS,
  POS_LIST_LOCATIONS,
  POS_LIST_RECENT_ORDERS,
  POS_LIST_RECENT_SHIFTS,
  POS_LIST_REFUNDS,
  POS_LIST_TEAM_MEMBERS,
  POS_SEARCH_ITEMS,
  SQUARE_TOOL_DEFINITIONS,
  SQUARE_TOOL_SCHEMAS,
} from './square.tools'
import type { WindowInput } from './square-window'

/// SquareProvider self-registers with IntegrationRegistry on module init so
/// future providers follow the same pattern (new file → register → tools
/// available; no edits to chat-tools.ts).
@Injectable()
export class SquareProvider implements IntegrationProvider, OnModuleInit {
  readonly id = SQUARE_PROVIDER_ID
  readonly label = 'Square'
  readonly domain = 'pos' as const
  readonly toolDefinitions = SQUARE_TOOL_DEFINITIONS
  readonly toolSchemas: Readonly<Record<string, z.ZodTypeAny>> = SQUARE_TOOL_SCHEMAS

  private readonly logger = new Logger(SquareProvider.name)

  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly square: SquareService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this)
  }

  /// Ping Square's merchants endpoint with a freshly-supplied PAT to
  /// confirm it works AND retrieve the merchant id. The call is intentionally
  /// lightweight — it costs Square nothing and lets us reject bad tokens at
  /// connect time instead of at first chat-agent invocation.
  async validateCredentials(input: {
    accessToken: string
    environment: 'production' | 'sandbox'
  }): Promise<{ externalAccountId: string | null; scopes?: string[] }> {
    return this.square.validatePat(input.accessToken, input.environment)
  }

  async dispatch(
    toolName: string,
    input: unknown,
    ctx: DispatchContext,
  ): Promise<ToolResult<unknown>> {
    // The registry has already validated `input` against this provider's
    // schemas, so we treat the values as known-shape here.
    switch (toolName) {
      case POS_SEARCH_ITEMS: {
        const i = input as { query: string; limit?: number }
        return this.square.searchItems(ctx.orgId, i)
      }
      case POS_GET_ITEM_INVENTORY: {
        const i = input as { venueId: string; catalogObjectIds: string[] }
        return this.square.getItemInventory(ctx.orgId, i)
      }
      case POS_LIST_RECENT_ORDERS: {
        const i = input as { venueId: string; limit?: number } & WindowInput
        return this.square.listRecentOrders(ctx.orgId, i)
      }
      case POS_GET_SALES_SUMMARY: {
        const i = input as { venueId: string } & WindowInput
        return this.square.getSalesSummary(ctx.orgId, i)
      }
      case POS_LIST_LOCATIONS: {
        return this.square.listLocations(ctx.orgId)
      }
      case POS_LIST_RECENT_SHIFTS: {
        const i = input as {
          venueId: string
          limit?: number
          teamMemberId?: string
        } & WindowInput
        return this.square.listRecentShifts(ctx.orgId, i)
      }
      case POS_GET_ACTIVE_SHIFTS: {
        const i = input as { venueId: string }
        return this.square.getActiveShifts(ctx.orgId, i)
      }
      case POS_GET_LABOR_SUMMARY: {
        const i = input as { venueId: string; teamMemberId?: string } & WindowInput
        return this.square.getLaborSummary(ctx.orgId, i)
      }
      case POS_COMPARE_PERIODS: {
        const i = input as {
          venueId: string
          metric: 'sales' | 'labor'
          periodA: { fromIso: string; toIso?: string; label?: string }
          periodB: { fromIso: string; toIso?: string; label?: string }
        }
        return this.square.comparePeriods(ctx.orgId, i)
      }
      case POS_GET_TOP_ITEMS: {
        const i = input as {
          venueId: string
          sortBy?: 'revenue' | 'quantity'
          limit?: number
        } & WindowInput
        return this.square.getTopItems(ctx.orgId, i)
      }
      case POS_GET_PAYMENT_BREAKDOWN: {
        const i = input as { venueId: string } & WindowInput
        return this.square.getPaymentBreakdown(ctx.orgId, i)
      }
      case POS_LIST_REFUNDS: {
        const i = input as { venueId: string; limit?: number } & WindowInput
        return this.square.listRefunds(ctx.orgId, i)
      }
      case POS_GET_REFUND_SUMMARY: {
        const i = input as { venueId: string } & WindowInput
        return this.square.getRefundSummary(ctx.orgId, i)
      }
      case POS_GET_HOURLY_BREAKDOWN: {
        const i = input as {
          venueId: string
          timezone?: 'venue' | 'utc'
        } & WindowInput
        return this.square.getHourlyBreakdown(ctx.orgId, i)
      }
      case POS_LIST_TEAM_MEMBERS: {
        const i = input as {
          status?: 'ACTIVE' | 'INACTIVE' | 'ALL'
          venueId?: string
          limit?: number
        }
        return this.square.listTeamMembers(ctx.orgId, i)
      }
      default:
        this.logger.warn(JSON.stringify({ event: 'square.unknown_tool', toolName }))
        return fail('not-supported', `Square provider has no tool "${toolName}"`)
    }
  }
}
