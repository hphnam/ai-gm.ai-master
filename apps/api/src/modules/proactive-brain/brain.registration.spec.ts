import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ok, type ToolResult } from '../../types'
import type { DispatchContext } from '../chat/tool-dispatcher'
import type { IntegrationProvider } from '../integrations/integration-provider'
import { BRAIN_PROVIDER_ID, BrainProvider } from './brain.provider'
import type { BrainService } from './brain.service'
import {
  BRAIN_CHECK_CHANGE_POINT,
  BRAIN_CHECK_CHECKLIST,
  BRAIN_CHECK_DEVIATION,
  BRAIN_CHECK_STOCK_COVER,
  BRAIN_DAILY_BRIEFING,
  BRAIN_DATA_FRESHNESS,
  BRAIN_FIND_SOP_GAPS,
  BRAIN_FORECAST_SALES,
  BRAIN_TOOL_DEFINITIONS,
  BRAIN_TOOL_SCHEMAS,
} from './brain.tools'

const CTX: DispatchContext = { orgId: 'org_1', userId: 'user_1', userRole: 'manager' }
const EXPECTED_TOOLS = [
  BRAIN_FORECAST_SALES,
  BRAIN_CHECK_DEVIATION,
  BRAIN_FIND_SOP_GAPS,
  BRAIN_CHECK_STOCK_COVER,
  BRAIN_CHECK_CHANGE_POINT,
  BRAIN_DAILY_BRIEFING,
  BRAIN_DATA_FRESHNESS,
  BRAIN_CHECK_CHECKLIST,
]

/// Minimal stand-in for IntegrationRegistry — replicates the parts BrainProvider
/// and the registration contract touch (register + the def↔schema check the real
/// register() enforces) without the DB-bound IntegrationsService import graph.
class FakeRegistry {
  registered: IntegrationProvider | null = null
  register(provider: IntegrationProvider): void {
    for (const def of provider.toolDefinitions) {
      if (!(def.name in provider.toolSchemas)) {
        throw new Error(`tool "${def.name}" has no matching schema`)
      }
    }
    this.registered = provider
  }
  getAllToolDefinitions(): string[] {
    return (this.registered?.toolDefinitions ?? []).map((d) => d.name)
  }
}

function makeProvider() {
  const registry = new FakeRegistry()
  const dispatched: { toolName?: string } = {}
  const service = {
    dispatch: async (toolName: string): Promise<ToolResult<unknown>> => {
      dispatched.toolName = toolName
      return ok({ routed: true })
    },
  } as unknown as BrainService
  const provider = new BrainProvider(registry as never, service)
  return { registry, provider, dispatched }
}

describe('brain.tools contract', () => {
  it('declares exactly the eight brain tools', () => {
    assert.deepEqual(BRAIN_TOOL_DEFINITIONS.map((d) => d.name).sort(), [...EXPECTED_TOOLS].sort())
  })

  it('every tool definition has a matching Zod schema (the register() contract)', () => {
    for (const def of BRAIN_TOOL_DEFINITIONS) {
      assert.ok(def.name in BRAIN_TOOL_SCHEMAS, `${def.name} missing schema`)
    }
  })
})

describe('BrainProvider self-registration', () => {
  it('registers itself on module init', () => {
    const { registry, provider } = makeProvider()
    provider.onModuleInit()
    assert.equal(registry.registered, provider)
  })

  it('exposes id=brain and domain=other', () => {
    const { provider } = makeProvider()
    assert.equal(provider.id, BRAIN_PROVIDER_ID)
    assert.equal(provider.domain, 'other')
  })

  it('surfaces all eight tool definitions through the registry', () => {
    const { registry, provider } = makeProvider()
    provider.onModuleInit()
    assert.deepEqual(registry.getAllToolDefinitions().sort(), [...EXPECTED_TOOLS].sort())
  })

  it('dispatch routes to the brain service', async () => {
    const { provider, dispatched } = makeProvider()
    const res = await provider.dispatch(BRAIN_FIND_SOP_GAPS, {}, CTX)
    assert.equal(dispatched.toolName, BRAIN_FIND_SOP_GAPS)
    assert.equal(res.ok, true)
  })
})
