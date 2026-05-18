// Plan 06-01 Task 1 — Cost capture helpers for chat-core.
//
// SCHEMA precision rationale (audit-S11):
//   chat_messages.costUsd + knowledge_items.ingestionCostUsd are Decimal(10,6).
//   Max value: $9999.999999 (covers 100M-token Opus call ~$7500 worst case).
//   Min value: $0.000001 (covers Voyage embed ~$0.00006 with headroom).
//   6dp matches Math.round(x * 1e6) / 1e6 helper output.
//   Future bump to Decimal(12,6) deferred until first row > $9999 (theoretical only).
//
// SOURCE citations (audit-S10): rates verified against Anthropic public pricing.
// Quarterly review trigger registered as D-06-01-C. New model added (e.g. Sonnet 5)
// also triggers a rate-version bump.

import { VOYAGE_DOC_USD_PER_CALL } from './section'

// Per-MTok rate shape — same channels for every Anthropic tier so RATES_BY_TIER stays typed.
export type AnthropicRateCard = {
  readonly input: number
  readonly output: number
  readonly cacheRead: number
  readonly cacheWrite: number
}

// Source: https://www.anthropic.com/pricing · verified 2026-05-01
// Sonnet 4.6 published rates per MTok: input $3, output $15, cache read $0.30, cache write $3.75.
export const SONNET_4_6_USD_PER_MTOK: AnthropicRateCard = {
  input: 3,
  output: 15,
  cacheRead: 0.3,
  cacheWrite: 3.75,
}

// Source: https://www.anthropic.com/pricing · verified 2026-05-01
// Haiku 4.5 published rates per MTok: input $1, output $5, cache read $0.10, cache write $1.25.
export const HAIKU_4_5_USD_PER_MTOK: AnthropicRateCard = {
  input: 1,
  output: 5,
  cacheRead: 0.1,
  cacheWrite: 1.25,
}

// Re-export Voyage rate so callers have one cost-helper import surface.
// VOYAGE_DOC_USD_PER_CALL is canonically defined in ./section.ts (single source of truth).
export { VOYAGE_DOC_USD_PER_CALL }

// AI SDK 6.x exposes inputTokenDetails on Anthropic provider responses; this shape mirrors
// the live wire format observed in Plan 01-03 W24 evidence (turn1.cacheWrite=99 turn2.cacheRead=9141).
// Source: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic · verified 2026-05-01
export type AnthropicUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export type AnthropicModelTier = 'sonnet-4-6' | 'haiku-4-5'

const RATES_BY_TIER: Record<AnthropicModelTier, AnthropicRateCard> = {
  'sonnet-4-6': SONNET_4_6_USD_PER_MTOK,
  'haiku-4-5': HAIKU_4_5_USD_PER_MTOK,
}

const MTOK = 1_000_000
const PRECISION = 1e6 // matches Decimal(10,6) column precision

const round6 = (n: number): number => Math.round(n * PRECISION) / PRECISION

// Cache-aware Anthropic cost calculation. cacheRead tokens cost less than fresh input;
// cacheWrite tokens cost more than fresh input. Total = sum across all four channels.
// AC-6 contract: every Anthropic call's cost reflects observed cache hit/miss split.
export function calculateAnthropicUsd(usage: AnthropicUsage, model: AnthropicModelTier): number {
  const rate = RATES_BY_TIER[model]
  const usd =
    (usage.inputTokens * rate.input) / MTOK +
    (usage.outputTokens * rate.output) / MTOK +
    (usage.cacheReadTokens * rate.cacheRead) / MTOK +
    (usage.cacheWriteTokens * rate.cacheWrite) / MTOK
  return round6(usd)
}

// Voyage cost calculation. Per-call rate is documented as flat $0.00006/call regardless of token
// count for voyage-3.5 document mode (see VOYAGE_DOC_USD_PER_CALL definition in section.ts).
export function calculateVoyageUsd(callCount: number): number {
  return round6(callCount * VOYAGE_DOC_USD_PER_CALL)
}

// Per-turn cost breakdown captured by CostTracker. Persisted as single Decimal value
// on chat_messages.costUsd; breakdown is logged via chat_core.turn_complete event
// (audit-M5 PII-safe).
//
// Plan 06-02 — extended from 4-stage to 5-stage with Analyser + Critic. Key order
// matches pipeline order (NOT alphabetical): triage → researchers → analyser →
// writer → critic → voyage → total. AC-8 + probe V38 enforce serialization order.
export type CostBreakdown = {
  triage: number
  researchers: number
  analyser: number
  writer: number
  critic: number
  voyage: number
  total: number
}
