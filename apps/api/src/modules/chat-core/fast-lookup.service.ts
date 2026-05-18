// Plan 06-04 hot-fix 2026-05-02 — deterministic lookup execution.
//
// Skips Triage + Researcher LLM calls when the user's question maps to a
// single structured query (contact, stock, supplier, checklist). Returns a
// synthesized ResearcherFinding which the orchestrator hands directly to
// the Writer in mode='lookup'. On any miss / failure: returns null and the
// orchestrator falls through to the full LLM pipeline.

import { Injectable } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import type { ResearcherFinding } from '../../types'
import { MockOpsService } from '../mock-ops/mock-ops.service'
import type { FastPathRecipe } from './fast-lookup-recipes'
import { chatCoreLogger, hashId } from './log-helpers'
import { getChecklist } from './tools/get-checklist.tool'
import { getPerson } from './tools/get-person.tool'

export type FastLookupContext = {
  orgId: string
  venueId: string | null
}

export type FastLookupResult = {
  finding: ResearcherFinding
  toolName: string
  hitCount: number
}

@Injectable()
export class FastLookupService {
  constructor(private readonly mockOps: MockOpsService) {}

  async execute(recipe: FastPathRecipe, ctx: FastLookupContext): Promise<FastLookupResult | null> {
    const t0 = Date.now()
    try {
      switch (recipe.tool) {
        case 'get_person':
          return await this.runGetPerson(recipe.roleQuery, ctx, t0)
        case 'get_stock_below_par':
          return await this.runStockBelowPar(ctx, t0)
        case 'get_supplier_by_name':
          return await this.runSupplierByName(recipe.name, ctx, t0)
        case 'get_upcoming_cutoffs':
          return await this.runUpcomingCutoffs(ctx, t0)
        case 'get_checklist':
          return await this.runChecklist(recipe.intent, ctx, t0)
        default: {
          const _exhaustive: never = recipe
          void _exhaustive
          return null
        }
      }
    } catch (err) {
      chatCoreLogger.warn('chat_core.fast_lookup_failed', {
        orgId: hashId(ctx.orgId),
        tool: recipe.tool,
        error: (err as Error)?.message ?? 'unknown',
        latencyMs: Date.now() - t0,
      })
      return null
    }
  }

  private async runGetPerson(
    roleQuery: string,
    ctx: FastLookupContext,
    t0: number,
  ): Promise<FastLookupResult | null> {
    // Try role-first — handles "cellar engineer", "duty manager", etc. The
    // tool tokenizes role internally so multi-word queries match partial
    // stored roles ("Gas Engineer" matches "cellar engineer").
    const r = await getPerson({ role: roleQuery }, ctx.orgId, ctx.venueId, prisma)
    if (!r.ok || r.data.length === 0) {
      this.logMiss('get_person', ctx, t0)
      return null
    }
    const lines = r.data.slice(0, 3).map((p) => formatContact(p))
    const summary = lines.join('\n')
    const citations = r.data.flatMap((p) =>
      p.mentions.map((m) => ({ knowledgeItemId: m.knowledgeItemId })),
    )
    this.logHit('get_person', r.data.length, ctx, t0)
    return {
      finding: { researcher: 'people', summary, citations },
      toolName: 'get_person',
      hitCount: r.data.length,
    }
  }

  private async runStockBelowPar(
    ctx: FastLookupContext,
    t0: number,
  ): Promise<FastLookupResult | null> {
    if (!ctx.venueId) return null
    const r = await this.mockOps.getStockBelowPar(ctx.venueId)
    if (!r.ok || r.data.length === 0) {
      this.logMiss('get_stock_below_par', ctx, t0)
      return null
    }
    const lines = r.data
      .slice(0, 10)
      .map(
        (s) =>
          `${s.name} ${s.currentQty}/${s.parLevel} ${s.unit}${
            s.supplierName ? ` (${s.supplierName})` : ''
          }`,
      )
    const summary = `${r.data.length} SKU(s) at or below par:\n${lines.join('\n')}`
    this.logHit('get_stock_below_par', r.data.length, ctx, t0)
    return {
      finding: { researcher: 'ops', summary, citations: [] },
      toolName: 'get_stock_below_par',
      hitCount: r.data.length,
    }
  }

  private async runSupplierByName(
    name: string,
    ctx: FastLookupContext,
    t0: number,
  ): Promise<FastLookupResult | null> {
    const r = await this.mockOps.getSupplierByName(name)
    if (!r.ok || r.data.length === 0) {
      this.logMiss('get_supplier_by_name', ctx, t0)
      return null
    }
    const lines = r.data
      .slice(0, 3)
      .map(
        (s) =>
          `${s.name}${s.contactName ? ` — ${s.contactName}` : ''}${
            s.phone ? ` ${s.phone}` : ''
          }${s.email ? ` ${s.email}` : ''} (lead ${s.leadTimeDays}d)`,
      )
    const summary = lines.join('\n')
    this.logHit('get_supplier_by_name', r.data.length, ctx, t0)
    return {
      finding: { researcher: 'ops', summary, citations: [] },
      toolName: 'get_supplier_by_name',
      hitCount: r.data.length,
    }
  }

  private async runUpcomingCutoffs(
    ctx: FastLookupContext,
    t0: number,
  ): Promise<FastLookupResult | null> {
    if (!ctx.venueId) return null
    const r = await this.mockOps.getUpcomingCutoffs(ctx.venueId, 4)
    if (!r.ok || r.data.length === 0) {
      this.logMiss('get_upcoming_cutoffs', ctx, t0)
      return null
    }
    const lines = r.data
      .slice(0, 5)
      .map(
        (c) =>
          `${c.supplierName}${c.contactName ? ` (${c.contactName}` : ''}${
            c.phone ? ` ${c.phone}` : ''
          }${c.contactName ? ')' : ''} — lead ${c.leadTimeDays}d, ${c.stockCount} SKU(s) tracked`,
      )
    const summary = `${r.data.length} cutoff(s) in next 4h:\n${lines.join('\n')}`
    this.logHit('get_upcoming_cutoffs', r.data.length, ctx, t0)
    return {
      finding: { researcher: 'ops', summary, citations: [] },
      toolName: 'get_upcoming_cutoffs',
      hitCount: r.data.length,
    }
  }

  private async runChecklist(
    intent: string,
    ctx: FastLookupContext,
    t0: number,
  ): Promise<FastLookupResult | null> {
    const r = await getChecklist(intent, ctx.orgId, ctx.venueId, prisma)
    if (!r.ok) {
      this.logMiss('get_checklist', ctx, t0)
      return null
    }
    const stepsBlock = r.data.steps.map((s) => `${s.index}. ${s.content}`).join('\n')
    const summary = `${r.data.title} (${r.data.steps.length} steps):\n${stepsBlock}`
    this.logHit('get_checklist', 1, ctx, t0)
    return {
      finding: {
        researcher: 'docs',
        summary,
        citations: [{ knowledgeItemId: r.data.knowledgeItemId }],
      },
      toolName: 'get_checklist',
      hitCount: 1,
    }
  }

  private logHit(tool: string, hitCount: number, ctx: FastLookupContext, t0: number): void {
    chatCoreLogger.info('chat_core.fast_lookup_hit', {
      orgId: hashId(ctx.orgId),
      tool,
      hitCount,
      latencyMs: Date.now() - t0,
    })
  }

  private logMiss(tool: string, ctx: FastLookupContext, t0: number): void {
    chatCoreLogger.info('chat_core.fast_lookup_miss', {
      orgId: hashId(ctx.orgId),
      tool,
      latencyMs: Date.now() - t0,
    })
  }
}

type ContactLike = {
  name: string
  role: string
  phone: string | null
  email: string | null
  isEmergencyContact: boolean
}

function formatContact(p: ContactLike): string {
  const bits = [`${p.name} — ${p.role}`]
  if (p.phone) bits.push(p.phone)
  if (p.email) bits.push(p.email)
  if (p.isEmergencyContact) bits.push('(emergency contact)')
  return bits.join(' ')
}
