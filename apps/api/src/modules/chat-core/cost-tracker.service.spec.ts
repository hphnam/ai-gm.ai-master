// Plan 06-02 Task 5 audit-S11 — CostTracker unit tests.
//
// Uses Node 22+ built-in `node:test` runner — no new test framework introduced
// (project has no existing Jest/Vitest setup; per Task 5 contract we don't
// add infrastructure). Run via:
//   npm run test:cost-tracker --workspace=api
// or directly:
//   node --import tsx --test apps/api/src/modules/chat-core/cost-tracker.service.spec.ts

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AnthropicUsage } from '../../types/cost'
import { CostTracker } from './cost-tracker.service'

const synth = (input: number, output: number): AnthropicUsage => ({
  inputTokens: input,
  outputTokens: output,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
})

describe('CostTracker — 5-stage CostBreakdown shape (audit-S11)', () => {
  it('empty tracker returns zeros + correct key order', () => {
    const tracker = new CostTracker()
    const { breakdown, totalUsd } = tracker.total()
    assert.equal(totalUsd, 0)
    assert.deepEqual(Object.keys(breakdown), [
      'triage',
      'researchers',
      'analyser',
      'writer',
      'critic',
      'voyage',
      'total',
    ])
    assert.equal(breakdown.triage, 0)
    assert.equal(breakdown.researchers, 0)
    assert.equal(breakdown.analyser, 0)
    assert.equal(breakdown.writer, 0)
    assert.equal(breakdown.critic, 0)
    assert.equal(breakdown.voyage, 0)
    assert.equal(breakdown.total, 0)
  })

  it('single triage record reflects in breakdown.triage and total', () => {
    const tracker = new CostTracker()
    tracker.recordTriage(synth(1000, 500))
    const { breakdown, totalUsd } = tracker.total()
    // Haiku 4.5: 1000 input × $1/MTok + 500 output × $5/MTok = 0.001 + 0.0025 = 0.0035
    assert.equal(breakdown.triage, 0.0035)
    assert.equal(breakdown.researchers, 0)
    assert.equal(breakdown.analyser, 0)
    assert.equal(totalUsd, 0.0035)
  })

  it('all 5 Anthropic stages + voyage sum to total within 6dp tolerance', () => {
    const tracker = new CostTracker()
    tracker.recordTriage(synth(100, 50))
    tracker.recordResearcher(synth(200, 100), 1)
    tracker.recordAnalyser(synth(300, 150)) // sonnet default
    tracker.recordWriter(synth(400, 200)) // sonnet default
    tracker.recordCritic(synth(150, 75))
    const { breakdown, totalUsd } = tracker.total()
    const sum =
      breakdown.triage +
      breakdown.researchers +
      breakdown.analyser +
      breakdown.writer +
      breakdown.critic +
      breakdown.voyage
    assert.ok(
      Math.abs(sum - totalUsd) < 1e-6,
      `sum=${sum} totalUsd=${totalUsd} diff=${Math.abs(sum - totalUsd)}`,
    )
    assert.equal(breakdown.total, totalUsd)
  })

  it('JSON.stringify preserves pipeline-order keys (V38 contract)', () => {
    const tracker = new CostTracker()
    tracker.recordTriage(synth(10, 5))
    tracker.recordResearcher(synth(20, 10), 0)
    tracker.recordAnalyser(synth(30, 15))
    tracker.recordWriter(synth(40, 20))
    tracker.recordCritic(synth(50, 25))
    const { breakdown } = tracker.total()
    const serialized = JSON.stringify(breakdown)
    // Verify keys appear in pipeline order (NOT alphabetical) by index check.
    const idxTriage = serialized.indexOf('"triage"')
    const idxResearchers = serialized.indexOf('"researchers"')
    const idxAnalyser = serialized.indexOf('"analyser"')
    const idxWriter = serialized.indexOf('"writer"')
    const idxCritic = serialized.indexOf('"critic"')
    const idxVoyage = serialized.indexOf('"voyage"')
    const idxTotal = serialized.indexOf('"total"')
    assert.ok(idxTriage < idxResearchers, 'triage before researchers')
    assert.ok(idxResearchers < idxAnalyser, 'researchers before analyser')
    assert.ok(idxAnalyser < idxWriter, 'analyser before writer')
    assert.ok(idxWriter < idxCritic, 'writer before critic')
    assert.ok(idxCritic < idxVoyage, 'critic before voyage')
    assert.ok(idxVoyage < idxTotal, 'voyage before total')
  })

  it('multiple researcher records sum correctly (re-research path)', () => {
    const tracker = new CostTracker()
    // Simulating 06-02 re-research dispatch: orchestrator records researcher
    // twice (initial + second pass after Analyser low-confidence).
    tracker.recordResearcher(synth(100, 50), 1)
    tracker.recordResearcher(synth(150, 75), 2)
    const { breakdown } = tracker.total()
    // Haiku 4.5: (100+150) × $1/MTok = 0.00025 + (50+75) × $5/MTok = 0.000625
    // Total researchers = 0.000875
    assert.equal(breakdown.researchers, 0.000875)
    // Voyage: 3 calls × $0.00006 = 0.00018
    assert.equal(breakdown.voyage, 0.00018)
  })

  it('voyage call count clamps to non-negative (defensive)', () => {
    const tracker = new CostTracker()
    tracker.recordResearcher(synth(10, 5), -1) // negative voyage count
    const { breakdown } = tracker.total()
    assert.equal(breakdown.voyage, 0)
  })
})
