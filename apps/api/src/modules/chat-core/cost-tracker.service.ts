// Plan 06-01 Task 3 — per-turn cost accumulator.
// Plan 06-02 — extended from 4-stage to 5-stage with Analyser + Critic.
//
// One CostTracker per chat-core turn. Each role records its Anthropic usage; the
// Docs researcher additionally records its Voyage embed call count. total()
// returns CostBreakdown and total USD, persisted as chat_messages.costUsd at
// end-of-turn aggregation. On partial failure (audit-M2), total() is called
// from the catch block so the turn-failed row carries partial spend.
//
// Key order in CostBreakdown matches pipeline order, NOT alphabetical:
// triage → researchers → analyser → writer → critic → voyage → total.
// Probe AC-8 + V38 enforce serialization order.

import {
  type AnthropicModelTier,
  type AnthropicUsage,
  type CostBreakdown,
  calculateAnthropicUsd,
  calculateVoyageUsd,
} from '../../types/cost'

type RoleEntry = { usage: AnthropicUsage; model: AnthropicModelTier }

export class CostTracker {
  private triageEntries: RoleEntry[] = []
  private researcherEntries: RoleEntry[] = []
  private analyserEntries: RoleEntry[] = []
  private writerEntries: RoleEntry[] = []
  private criticEntries: RoleEntry[] = []
  private voyageCalls = 0

  recordTriage(usage: AnthropicUsage, model: AnthropicModelTier = 'haiku-4-5'): void {
    this.triageEntries.push({ usage, model })
  }

  recordResearcher(
    usage: AnthropicUsage,
    voyageCalls: number,
    model: AnthropicModelTier = 'haiku-4-5',
  ): void {
    this.researcherEntries.push({ usage, model })
    this.voyageCalls += Math.max(0, voyageCalls)
  }

  recordAnalyser(usage: AnthropicUsage, model: AnthropicModelTier = 'sonnet-4-6'): void {
    this.analyserEntries.push({ usage, model })
  }

  recordWriter(usage: AnthropicUsage, model: AnthropicModelTier = 'sonnet-4-6'): void {
    this.writerEntries.push({ usage, model })
  }

  recordCritic(usage: AnthropicUsage, model: AnthropicModelTier = 'haiku-4-5'): void {
    this.criticEntries.push({ usage, model })
  }

  total(): { breakdown: CostBreakdown; totalUsd: number } {
    const triage = sumEntries(this.triageEntries)
    const researchers = sumEntries(this.researcherEntries)
    const analyser = sumEntries(this.analyserEntries)
    const writer = sumEntries(this.writerEntries)
    const critic = sumEntries(this.criticEntries)
    const voyage = calculateVoyageUsd(this.voyageCalls)
    const total = round6(triage + researchers + analyser + writer + critic + voyage)
    // Key order matters for AC-8 serialization assertion (V38).
    const breakdown: CostBreakdown = {
      triage,
      researchers,
      analyser,
      writer,
      critic,
      voyage,
      total,
    }
    return { breakdown, totalUsd: total }
  }
}

function sumEntries(entries: RoleEntry[]): number {
  return round6(entries.reduce((acc, e) => acc + calculateAnthropicUsd(e.usage, e.model), 0))
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6
