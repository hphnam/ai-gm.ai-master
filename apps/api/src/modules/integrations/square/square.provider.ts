import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import type { z } from 'zod'
import { fail, type ToolResult } from '../../../types'
import type { DispatchContext } from '../../chat/tool-dispatcher'
import type { IntegrationProvider } from '../integration-provider'
import { IntegrationRegistry } from '../integration-registry'
import { SQUARE_PROVIDER_ID, SquareService } from './square.service'
import {
  POS_COMPARE_PERIODS,
  POS_COMPUTE_COGS_FROM_PERCENT,
  POS_GET_ACTIVE_SHIFTS,
  POS_GET_BOOKING_SUMMARY,
  POS_GET_CASH_DRAWER_SUMMARY,
  POS_GET_CATEGORY_SALES,
  POS_GET_COGS_SUMMARY,
  POS_GET_CUSTOMER_SUMMARY,
  POS_GET_DISCOUNT_USAGE,
  POS_GET_DISPUTE_SUMMARY,
  POS_GET_GIFT_CARD_LIABILITY,
  POS_GET_HOURLY_BREAKDOWN,
  POS_GET_INVOICE_SUMMARY,
  POS_GET_ITEM_COSTS,
  POS_GET_ITEM_INVENTORY,
  POS_GET_LABOR_SUMMARY,
  POS_GET_LOYALTY_SUMMARY,
  POS_GET_MODIFIER_POPULARITY,
  POS_GET_PAYMENT_BREAKDOWN,
  POS_GET_REFUND_SUMMARY,
  POS_GET_SALES_SUMMARY,
  POS_GET_SCHEDULED_LABOR_SUMMARY,
  POS_GET_TOP_ITEMS,
  POS_LIST_BOOKINGS,
  POS_LIST_DEVICES,
  POS_LIST_DISPUTES,
  POS_LIST_GIFT_CARDS,
  POS_LIST_INVOICES,
  POS_LIST_LOCATIONS,
  POS_LIST_PAYOUTS,
  POS_LIST_RECENT_ORDERS,
  POS_LIST_RECENT_SHIFTS,
  POS_LIST_REFUNDS,
  POS_LIST_SCHEDULED_SHIFTS,
  POS_LIST_TEAM_MEMBERS,
  POS_LIST_VENDORS,
  POS_SEARCH_CUSTOMERS,
  POS_SEARCH_ITEMS,
  SQUARE_TOOL_DEFINITIONS,
  SQUARE_TOOL_SCHEMAS,
} from './square.tools'
import { SquareCatalogExtrasService } from './square-catalog-extras.service'
import { SquareCogsService } from './square-cogs.service'
import { SquareCommerceService } from './square-commerce.service'
import { SquareCrmService } from './square-crm.service'
import type { ScheduleWindowInput, WindowInput } from './square-window'

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
    private readonly cogs: SquareCogsService,
    private readonly commerce: SquareCommerceService,
    private readonly catalogExtras: SquareCatalogExtrasService,
    private readonly crm: SquareCrmService,
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
      case POS_LIST_SCHEDULED_SHIFTS: {
        const i = input as {
          venueId: string
          limit?: number
          teamMemberId?: string
          includeDrafts?: boolean
        } & ScheduleWindowInput
        return this.square.listScheduledShifts(ctx.orgId, i)
      }
      case POS_GET_SCHEDULED_LABOR_SUMMARY: {
        const i = input as {
          venueId: string
          teamMemberId?: string
          includeDrafts?: boolean
        } & ScheduleWindowInput
        return this.square.getScheduledLaborSummary(ctx.orgId, i)
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

      // ─── COGS ──────────────────────────────────────────────────────────
      case POS_GET_ITEM_COSTS: {
        const i = input as { venueId: string; catalogObjectIds?: string[]; lookbackDays?: number }
        return this.cogs.getItemCosts(ctx.orgId, i)
      }
      case POS_GET_COGS_SUMMARY: {
        const i = input as { venueId: string; lookbackDays?: number } & WindowInput
        return this.cogs.getCogsSummary(ctx.orgId, i)
      }
      case POS_COMPUTE_COGS_FROM_PERCENT: {
        const i = input as { grossAmount: number; costPercent: number; currency?: string }
        return this.cogs.computeCogsFromPercent(i)
      }

      // ─── Commerce / risk ───────────────────────────────────────────────
      case POS_LIST_DISPUTES: {
        const i = input as { venueId: string; limit?: number; states?: string[] }
        return this.commerce.listDisputes(ctx.orgId, i)
      }
      case POS_GET_DISPUTE_SUMMARY: {
        const i = input as { venueId: string }
        return this.commerce.getDisputeSummary(ctx.orgId, i)
      }
      case POS_GET_CASH_DRAWER_SUMMARY: {
        const i = input as { venueId: string; limit?: number } & WindowInput
        return this.commerce.getCashDrawerSummary(ctx.orgId, i)
      }
      case POS_LIST_GIFT_CARDS: {
        const i = input as { limit?: number; state?: string }
        return this.commerce.listGiftCards(ctx.orgId, i)
      }
      case POS_GET_GIFT_CARD_LIABILITY: {
        return this.commerce.getGiftCardLiability(ctx.orgId)
      }
      case POS_LIST_INVOICES: {
        const i = input as { venueId: string; limit?: number; status?: string[] }
        return this.commerce.listInvoices(ctx.orgId, i)
      }
      case POS_GET_INVOICE_SUMMARY: {
        const i = input as { venueId: string }
        return this.commerce.getInvoiceSummary(ctx.orgId, i)
      }
      case POS_LIST_PAYOUTS: {
        const i = input as {
          venueId: string
          limit?: number
          status?: 'SENT' | 'PAID' | 'FAILED'
        } & WindowInput
        return this.commerce.listPayouts(ctx.orgId, i)
      }

      // ─── Catalog organisation ──────────────────────────────────────────
      case POS_LIST_VENDORS: {
        const i = input as { limit?: number; status?: string }
        return this.catalogExtras.listVendors(ctx.orgId, i)
      }
      case POS_GET_CATEGORY_SALES: {
        const i = input as { venueId: string; limit?: number } & WindowInput
        return this.catalogExtras.getCategorySales(ctx.orgId, i)
      }
      case POS_GET_MODIFIER_POPULARITY: {
        const i = input as { venueId: string; limit?: number } & WindowInput
        return this.catalogExtras.getModifierPopularity(ctx.orgId, i)
      }
      case POS_GET_DISCOUNT_USAGE: {
        const i = input as { venueId: string; limit?: number } & WindowInput
        return this.catalogExtras.getDiscountUsage(ctx.orgId, i)
      }

      // ─── CRM / loyalty / bookings / devices ────────────────────────────
      case POS_SEARCH_CUSTOMERS: {
        const i = input as { query?: string; email?: string; phone?: string; limit?: number }
        return this.crm.searchCustomers(ctx.orgId, i)
      }
      case POS_GET_CUSTOMER_SUMMARY: {
        return this.crm.getCustomerSummary(ctx.orgId)
      }
      case POS_GET_LOYALTY_SUMMARY: {
        return this.crm.getLoyaltySummary(ctx.orgId)
      }
      case POS_LIST_BOOKINGS: {
        const i = input as {
          venueId: string
          limit?: number
          sinceHours?: number
          aheadHours?: number
        }
        return this.crm.listBookings(ctx.orgId, i)
      }
      case POS_GET_BOOKING_SUMMARY: {
        const i = input as { venueId: string; aheadHours?: number }
        return this.crm.getBookingSummary(ctx.orgId, i)
      }
      case POS_LIST_DEVICES: {
        const i = input as { venueId?: string; limit?: number }
        return this.crm.listDevices(ctx.orgId, i)
      }

      default:
        this.logger.warn(JSON.stringify({ event: 'square.unknown_tool', toolName }))
        return fail('not-supported', `Square provider has no tool "${toolName}"`)
    }
  }
}
