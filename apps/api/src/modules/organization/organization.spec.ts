import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currencyCodeFor,
  currencySymbolFor,
  emergencyNumberFor,
  OrganizationProfileSchema,
} from '../../types'
import { readOrganizationProfile } from './organization.service'

describe('organization profile parsing', () => {
  it('returns an empty profile for null metadata', () => {
    assert.deepEqual(readOrganizationProfile(null), {})
  })

  it('returns an empty profile when metadata has no profile key', () => {
    assert.deepEqual(readOrganizationProfile({ other: 'thing' }), {})
  })

  it('returns an empty profile for a malformed profile blob', () => {
    assert.deepEqual(readOrganizationProfile({ profile: { businessType: 123 } }), {})
  })

  it('tolerates unknown keys on read, keeping the known fields', () => {
    const profile = readOrganizationProfile({
      profile: { businessType: 'cafe', someFutureField: 'ignored' },
    })
    assert.equal(profile.businessType, 'cafe')
    assert.equal('someFutureField' in profile, false)
  })

  it('extracts a valid profile from metadata', () => {
    const profile = readOrganizationProfile({
      profile: { businessType: 'brewpub', goals: ['margin'] },
    })
    assert.equal(profile.businessType, 'brewpub')
    assert.deepEqual(profile.goals, ['margin'])
  })

  it('uppercases country and currency codes', () => {
    const parsed = OrganizationProfileSchema.parse({ country: 'us', currency: 'usd' })
    assert.equal(parsed.country, 'US')
    assert.equal(parsed.currency, 'USD')
  })

  it('rejects extra keys (strict)', () => {
    assert.equal(OrganizationProfileSchema.safeParse({ wat: 1 }).success, false)
  })
})

describe('operating context derivation', () => {
  it('defaults to 999 when no country is set', () => {
    assert.equal(emergencyNumberFor(undefined), '999')
  })

  it('maps US to 911', () => {
    assert.equal(emergencyNumberFor('US'), '911')
  })

  it('falls back to 112 for an unknown country', () => {
    assert.equal(emergencyNumberFor('ZZ'), '112')
  })

  it('defaults currency to GBP when nothing is set', () => {
    assert.equal(currencyCodeFor(null), 'GBP')
  })

  it('derives currency from country when currency is unset', () => {
    assert.equal(currencyCodeFor({ country: 'US' }), 'USD')
  })

  it('prefers an explicit currency over the country default', () => {
    assert.equal(currencyCodeFor({ country: 'US', currency: 'EUR' }), 'EUR')
  })

  it('renders the pound symbol for GBP', () => {
    assert.equal(currencySymbolFor('GBP'), '£')
  })
})
