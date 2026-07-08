import type { z } from 'zod'
import type { ToolResult } from '../../types'
import type { DispatchContext } from '../chat/tool-dispatcher'

/// Contract every external integration implements. A provider declares its
/// Anthropic-style tool definitions and matching Zod schemas, plus a single
/// dispatch entry point that the ChatModule routes into.
///
/// Why one interface across very different SaaS APIs: the chat agent only
/// cares about "what tools are available right now" and "execute one with
/// validated input". The provider hides credential handling, SDK calls,
/// rate-limit handling, and result shaping — all of which are wildly
/// different per vendor — behind a shape stable enough for the chat surface
/// to never need editing when a new integration lands.
export interface IntegrationToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
  /// Minimum org role allowed to invoke this capability. FAIL-CLOSED: an
  /// integration tool that OMITS this is treated as 'manager' by the registry
  /// — a new tool is withheld from staff until a provider deliberately marks it
  /// 'staff'. So a forgotten classification costs staff access to a new tool
  /// (safe, reversible), never leaks financial / cross-person data. Mark only
  /// the genuinely operational tools (stock, menu, bookings) 'staff'. Scopes by
  /// capability, not phrasing — a reworded ask that routes to a manager tool is
  /// still blocked.
  minRole?: ToolMinRole
}

/// Access floor for a tool. 'staff' = everyone; 'manager' = manager + owner.
export type ToolMinRole = 'staff' | 'manager'

/// Fail-closed default for an integration tool whose provider left minRole
/// unset — see IntegrationToolDefinition.minRole.
export const DEFAULT_TOOL_MIN_ROLE: ToolMinRole = 'manager'

/// True when `userRole` clears the tool's access floor. Unknown roles clear
/// only 'staff' tools (matches the fail-safe 'staff' default in the chat
/// controller), so an unexpected role never reaches manager data.
export function roleMeetsMinRole(userRole: string, minRole: ToolMinRole): boolean {
  if (minRole === 'staff') return true
  return userRole === 'manager' || userRole === 'owner'
}

/// Logical category a provider competes in. Used to enforce "one provider
/// active per domain per org" at connect time — so an org can't have both
/// Square AND Toast connected at the same time and have us silently route
/// to whichever was upserted most recently. Add new domains as we ship new
/// integration categories.
export type IntegrationDomain = 'pos' | 'accounting' | 'crm' | 'brewery' | 'other'

export interface IntegrationProvider {
  /// Stable slug — matches Integration.provider in the DB. Used as the
  /// connect/disconnect path segment and the lookup key in the registry.
  readonly id: string

  /// Human-readable label for the connect UI.
  readonly label: string

  /// Capability category. Connecting a second provider in the same domain
  /// for the same org is refused at the service layer.
  readonly domain: IntegrationDomain

  /// Tool definitions in the same shape as TOOL_DEFINITIONS — fed straight
  /// into the AI SDK alongside the built-in tools.
  readonly toolDefinitions: ReadonlyArray<IntegrationToolDefinition>

  /// Input schema per tool. Keyed by tool name. The registry validates
  /// against this before invoking dispatch().
  readonly toolSchemas: Readonly<Record<string, z.ZodTypeAny>>

  /// Optional: validate a freshly-supplied PAT/OAuth token by hitting the
  /// vendor's identity endpoint. Returns the external account id (e.g.
  /// Square merchant_id) so we can sanity-check the row at use time and
  /// surface "you're connected as <Acme Bar>" in the UI. Throwing here
  /// means the connect attempt fails and nothing is persisted.
  validateCredentials?(input: {
    accessToken: string
    environment: 'production' | 'sandbox'
  }): Promise<{ externalAccountId: string | null; scopes?: string[] }>

  /// Execute a tool call after schema validation. The provider receives the
  /// already-parsed input plus the chat dispatch context (orgId, userId,
  /// userRole) so it can scope all reads to the caller's organisation.
  dispatch(toolName: string, input: unknown, ctx: DispatchContext): Promise<ToolResult<unknown>>
}
