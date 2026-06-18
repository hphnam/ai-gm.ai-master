import { Injectable, Logger } from '@nestjs/common'
import { fail, type ToolResult } from '../../types'
import type { DispatchContext } from '../chat/tool-dispatcher'
import type { IntegrationProvider, IntegrationToolDefinition } from './integration-provider'
import { IntegrationsService } from './integrations.service'
import { createRateLimiter } from './rate-limit'

/// Per-org throttle on integration tool invocation. The chat agent can be
/// nudged via prompt injection in indexed docs to call pos_* tools in a
/// loop — both DoS-y on us and a billing-amplification vector against the
/// org's Square account. Cap at 30 hits / min / (org, tool) — comfortably
/// above any plausible legitimate burst (e.g. paging through orders).
const TOOL_INVOCATION_LIMITER = createRateLimiter(60_000, 30)

/// In-process registry that integration providers self-register into on
/// module init. The ChatModule queries this for tool definitions when
/// building the per-turn ToolSet, and for dispatch when the built-in tool
/// switch falls through to a registered tool name.
///
/// Capability-based routing: multiple providers MAY claim the same tool name
/// (e.g. Square + Toast both implementing `pos_search_items`). When that
/// happens, the model still sees the tool ONCE — the first-registered
/// provider's definition/schema becomes the canonical surface, and at
/// dispatch time we look up which provider the calling org has connected as
/// active. If two POS providers share a capability name, their schemas MUST
/// be call-compatible (the agent sees one shape and won't know which
/// provider it's calling).
@Injectable()
export class IntegrationRegistry {
  private readonly logger = new Logger(IntegrationRegistry.name)
  private readonly providers = new Map<string, IntegrationProvider>()
  /// tool name → set of providers that implement it. A given capability is
  /// usually implemented by one provider; when two implement it (e.g. two
  /// POS vendors), the org's active Integration row picks the winner.
  private readonly toolToProviders = new Map<string, Set<string>>()

  constructor(private readonly integrations: IntegrationsService) {}

  register(provider: IntegrationProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`integration provider "${provider.id}" already registered`)
    }
    for (const def of provider.toolDefinitions) {
      if (!(def.name in provider.toolSchemas)) {
        throw new Error(
          `provider "${provider.id}" declares tool "${def.name}" without a matching toolSchemas entry`,
        )
      }
      const set = this.toolToProviders.get(def.name) ?? new Set<string>()
      if (set.size > 0) {
        this.logger.log(
          JSON.stringify({
            event: 'integration_registry.capability_shared',
            toolName: def.name,
            existingProviders: [...set],
            newProvider: provider.id,
          }),
        )
      }
      set.add(provider.id)
      this.toolToProviders.set(def.name, set)
    }
    this.providers.set(provider.id, provider)
    this.logger.log(
      JSON.stringify({
        event: 'integration_registry.register',
        providerId: provider.id,
        toolCount: provider.toolDefinitions.length,
      }),
    )
  }

  /// Every registered tool definition, deduplicated by tool name. When two
  /// providers claim the same name the first-registered wins for the def
  /// shape exposed to the model — they're contract-required to be compatible.
  getAllToolDefinitions(): ReadonlyArray<IntegrationToolDefinition> {
    const seen = new Map<string, IntegrationToolDefinition>()
    for (const provider of this.providers.values()) {
      for (const def of provider.toolDefinitions) {
        if (!seen.has(def.name)) seen.set(def.name, def)
      }
    }
    return [...seen.values()]
  }

  /// Tool name → Zod schema lookup. Mirrors getAllToolDefinitions —
  /// first-registered provider's schema is canonical for shared capabilities.
  getAllToolSchemas(): Readonly<Record<string, import('zod').ZodTypeAny>> {
    const out: Record<string, import('zod').ZodTypeAny> = {}
    for (const provider of this.providers.values()) {
      for (const def of provider.toolDefinitions) {
        if (!(def.name in out)) {
          out[def.name] = provider.toolSchemas[def.name]
        }
      }
    }
    return out
  }

  hasTool(toolName: string): boolean {
    return this.toolToProviders.has(toolName)
  }

  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId)
  }

  getProvider(providerId: string): IntegrationProvider | undefined {
    return this.providers.get(providerId)
  }

  listProviderIds(): string[] {
    return [...this.providers.keys()]
  }

  /// Provider ids in the same capability domain as `providerId`, excluding
  /// `providerId` itself. Used by the connect-pat flow to enforce one
  /// provider active per domain per org (controller passes this to
  /// IntegrationsService.connectPat).
  siblingsInDomain(providerId: string): string[] {
    const me = this.providers.get(providerId)
    if (!me) return []
    return [...this.providers.values()]
      .filter((p) => p.domain === me.domain && p.id !== providerId)
      .map((p) => p.id)
  }

  /// All provider ids registered in `domain`. Used by the dispatcher's
  /// integration-misroute telemetry so a "stock query came in but only Xero
  /// is connected" doesn't get logged as a POS misroute candidate.
  listProviderIdsByDomain(domain: import('./integration-provider').IntegrationDomain): string[] {
    return [...this.providers.values()].filter((p) => p.domain === domain).map((p) => p.id)
  }

  async dispatch(
    toolName: string,
    input: unknown,
    ctx: DispatchContext,
  ): Promise<ToolResult<unknown>> {
    const candidates = this.toolToProviders.get(toolName)
    if (!candidates || candidates.size === 0) {
      return fail('not-supported', `tool: ${toolName}`)
    }

    if (!TOOL_INVOCATION_LIMITER.allow(`${ctx.orgId}|${toolName}`)) {
      this.logger.warn(
        JSON.stringify({
          event: 'integration_registry.rate_limited',
          orgId: ctx.orgId,
          toolName,
        }),
      )
      return fail(
        'error',
        `Rate limit hit for ${toolName} (max 30/min per org). Wait a moment before retrying.`,
      )
    }

    // Pick the org's active integration. Single-provider case (today, with
    // only Square): we still query the DB so a non-connected org gets a
    // clear "not connected" message instead of a provider-side error.
    const activeProviderId = await this.integrations.resolveActiveProvider(ctx.orgId, [
      ...candidates,
    ])
    if (!activeProviderId) {
      const list = [...candidates].sort().join(' or ')
      return fail(
        'not-supported',
        `No integration connected for "${toolName}". Ask an owner or manager to connect ${list} in Settings → Integrations.`,
      )
    }
    const provider = this.providers.get(activeProviderId)
    if (!provider) {
      return fail('error', `provider "${activeProviderId}" registered name but not instance`)
    }

    const schema = provider.toolSchemas[toolName]
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return fail(
        'invalid-input',
        `invalid input for ${toolName}: ${parsed.error.issues[0]?.message ?? 'zod error'}`,
      )
    }
    try {
      return await provider.dispatch(toolName, parsed.data, ctx)
    } catch (err) {
      const message = (err as Error).message ?? 'unknown provider error'
      this.logger.error(
        JSON.stringify({
          event: 'integration_registry.dispatch_error',
          providerId: activeProviderId,
          toolName,
          message,
        }),
      )
      return fail('error', message)
    }
  }
}
