import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import type { DispatchContext } from '../chat/tool-dispatcher'
import { BrainUnavailableError } from './brain.client'
import { BrainService } from './brain.service'
import {
  BRAIN_CHECK_CHECKLIST,
  BRAIN_CHECK_DEVIATION,
  BRAIN_FIND_SOP_GAPS,
  BRAIN_FORECAST_SALES,
} from './brain.tools'

const CTX: DispatchContext = { orgId: 'org_1', userId: 'user_1', userRole: 'manager' }

/// A stubbed brain client — records which endpoint was hit and with what, and
/// lets each test set the response or force a failure. No network.
class StubClient {
  enabled = true
  lastCall: { method: string; arg?: unknown } | null = null
  forecastN = 1
  throwUnavailable = false

  private record(method: string, arg?: unknown) {
    if (this.throwUnavailable) throw new BrainUnavailableError('brain down')
    this.lastCall = { method, arg }
  }

  async forecast(q: unknown) {
    this.record('forecast', q)
    return {
      venue: 'beer_hall',
      layer: 'L1',
      level: 0.9,
      key: null,
      n: this.forecastN,
      forecast: this.forecastN
        ? [
            {
              date: '2026-05-01',
              yhat: 500,
              lo: 100,
              hi: 900,
              level: 0.9,
              model: 'conformal_rung2_ets',
            },
          ]
        : [],
    }
  }
  async checkDeviation(q: unknown) {
    this.record('checkDeviation', q)
    return {
      venue: 'beer_hall',
      layer: 'L1',
      level: 0.9,
      n_checked: 2,
      n_breaches: 1,
      breaches: [
        {
          date: '2026-05-15',
          value: 2262,
          lo: 78,
          hi: 1550,
          direction: 'above',
          exceedance_ratio: 0.97,
          severity: 'medium',
        },
      ],
    }
  }
  async sopGaps() {
    this.record('sopGaps')
    return {
      failure_rate: 0.189,
      rolling7_max: 0.25,
      active_days: 25,
      channels: { web: 735 },
      embedding_backend: 'tfidf',
      gaps: [
        {
          size: 5,
          failed: 3,
          failure_density: 0.6,
          score: 1.8,
          venue_tags: { estate: 5 },
          examples: ['Why is the gas not connecting?'],
        },
      ],
    }
  }
  async checkChecklist(q: unknown) {
    this.record('checkChecklist', q)
    return {
      checklist: 'closing',
      dow: 2,
      is_sunday: false,
      n_expected: 28,
      n_expected_mandatory: 28,
      missed: [[8, 'Turn off gas bottles', 5]],
      weighted_score: 5,
      critical_missed: [8],
      unsigned: false,
      skipped: false,
      late: false,
      severity: 'high',
    }
  }
}

function makeService(): { svc: BrainService; stub: StubClient } {
  const stub = new StubClient()
  const svc = new BrainService(stub as never)
  return { svc, stub }
}

describe('BrainService.dispatch', () => {
  let svc: BrainService
  let stub: StubClient
  beforeEach(() => {
    ;({ svc, stub } = makeService())
  })

  it('forecast: valid input hits the forecast endpoint and returns ok with a band', async () => {
    const res = await svc.dispatch(BRAIN_FORECAST_SALES, { venue: 'beer_hall', level: 0.9 }, CTX)
    assert.equal(res.ok, true)
    assert.equal(stub.lastCall?.method, 'forecast')
    assert.ok(res.ok && Array.isArray((res.data as { forecast: unknown[] }).forecast))
  })

  it('forecast: rejects an unknown venue with invalid-input', async () => {
    const res = await svc.dispatch(BRAIN_FORECAST_SALES, { venue: 'not_a_venue' }, CTX)
    assert.equal(res.ok, false)
    assert.equal(res.ok === false && res.reason, 'invalid-input')
    assert.equal(stub.lastCall, null) // never reached the client
  })

  it('forecast: returns no-data when the brain has no band', async () => {
    stub.forecastN = 0
    const res = await svc.dispatch(BRAIN_FORECAST_SALES, { venue: 'ellel' }, CTX)
    assert.equal(res.ok === false && res.reason, 'no-data')
  })

  it('forecast: rejects an L2/L3 request without a key', async () => {
    const res = await svc.dispatch(BRAIN_FORECAST_SALES, { venue: 'beer_hall', layer: 'L2' }, CTX)
    assert.equal(res.ok === false && res.reason, 'invalid-input')
    assert.equal(stub.lastCall, null)
  })

  it('forecast: accepts an L2 request when a key is supplied', async () => {
    const res = await svc.dispatch(
      BRAIN_FORECAST_SALES,
      { venue: 'beer_hall', layer: 'L2', key: 'Beer' },
      CTX,
    )
    assert.equal(res.ok, true)
    assert.equal(stub.lastCall?.method, 'forecast')
  })

  it('deviation: valid input hits the deviation endpoint and returns breaches', async () => {
    const res = await svc.dispatch(
      BRAIN_CHECK_DEVIATION,
      { venue: 'beer_hall', observations: [{ date: '2026-05-15', value: 2262 }] },
      CTX,
    )
    assert.equal(stub.lastCall?.method, 'checkDeviation')
    assert.ok(res.ok && (res.data as { n_breaches: number }).n_breaches === 1)
  })

  it('sop-gaps: returns the failure rate and ranked gaps', async () => {
    const res = await svc.dispatch(BRAIN_FIND_SOP_GAPS, {}, CTX)
    assert.equal(stub.lastCall?.method, 'sopGaps')
    assert.ok(res.ok && (res.data as { failure_rate: number }).failure_rate === 0.189)
  })

  it('checklist: valid input returns weighted misses', async () => {
    const res = await svc.dispatch(
      BRAIN_CHECK_CHECKLIST,
      { checklist: 'closing', completed: [1, 2, 3], dow: 2 },
      CTX,
    )
    assert.equal(stub.lastCall?.method, 'checkChecklist')
    assert.ok(res.ok && (res.data as { critical_missed: number[] }).critical_missed.includes(8))
  })

  it('checklist: rejects an out-of-range day-of-week with invalid-input', async () => {
    const res = await svc.dispatch(
      BRAIN_CHECK_CHECKLIST,
      { checklist: 'closing', completed: [1], dow: 9 },
      CTX,
    )
    assert.equal(res.ok === false && res.reason, 'invalid-input')
  })

  it('returns not-supported for an unknown tool', async () => {
    const res = await svc.dispatch('brain_unknown', {}, CTX)
    assert.equal(res.ok === false && res.reason, 'not-supported')
  })

  it('returns not-supported when the brain is disabled', async () => {
    stub.enabled = false
    const res = await svc.dispatch(BRAIN_FORECAST_SALES, { venue: 'beer_hall' }, CTX)
    assert.equal(res.ok === false && res.reason, 'not-supported')
  })

  it('maps an unreachable brain to an error ToolResult', async () => {
    stub.throwUnavailable = true
    const res = await svc.dispatch(BRAIN_FIND_SOP_GAPS, {}, CTX)
    assert.equal(res.ok === false && res.reason, 'error')
  })
})
