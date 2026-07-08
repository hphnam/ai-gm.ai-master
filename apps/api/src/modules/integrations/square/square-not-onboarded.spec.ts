import assert from 'node:assert/strict'
import test from 'node:test'
import { isFeatureNotOnboarded } from './square.service'

test('matches the 401 Square returns for a merchant without Appointments', () => {
  assert.equal(isFeatureNotOnboarded(401, 'Merchant not onboarded to Appointments'), true)
})

test('matches a 403 with a not-onboarded detail', () => {
  assert.equal(isFeatureNotOnboarded(403, 'Merchant not onboarded to Appointments'), true)
})

test('a plain 401 with a revoked-token detail stays a credential failure', () => {
  assert.equal(isFeatureNotOnboarded(401, 'This request could not be authorized.'), false)
})

test('a 401 with no detail stays a credential failure', () => {
  assert.equal(isFeatureNotOnboarded(401, undefined), false)
})

test('a not-onboarded detail on a non-auth status does not match', () => {
  assert.equal(isFeatureNotOnboarded(400, 'Merchant not onboarded to Appointments'), false)
})
