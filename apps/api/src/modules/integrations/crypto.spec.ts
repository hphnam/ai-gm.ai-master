import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  __resetCryptoKeyCacheForTests,
  constantTimeEquals,
  decryptToken,
  encryptToken,
} from './crypto'

// Fixed 32-byte test key. Real deployments set this via env; tests pin a
// known value so encrypt/decrypt round-trip is deterministic across runs.
const TEST_KEY = 'hex:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('integrations crypto', () => {
  beforeEach(() => {
    process.env.INTEGRATION_TOKEN_KEY = TEST_KEY
    __resetCryptoKeyCacheForTests()
  })

  it('round-trips a plaintext token', () => {
    const plaintext = 'EAAAlxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    const cipher = encryptToken(plaintext)
    assert.match(cipher, /^v1:[A-Za-z0-9+/=]+$/)
    assert.equal(decryptToken(cipher), plaintext)
  })

  it('produces different ciphertexts for the same plaintext (random IV+salt)', () => {
    const plaintext = 'sample-token'
    const a = encryptToken(plaintext)
    const b = encryptToken(plaintext)
    assert.notEqual(a, b)
    assert.equal(decryptToken(a), plaintext)
    assert.equal(decryptToken(b), plaintext)
  })

  it('rejects tampered ciphertext via GCM auth tag', () => {
    const cipher = encryptToken('original')
    const parts = cipher.split(':')
    const buf = Buffer.from(parts[1], 'base64')
    buf[buf.length - 1] ^= 0xff // flip a bit in the auth tag
    const tampered = `v1:${buf.toString('base64')}`
    assert.throws(() => decryptToken(tampered))
  })

  it('rejects unversioned ciphertext', () => {
    assert.throws(() => decryptToken('aGVsbG8='), /missing version prefix/)
  })

  it('rejects unknown version', () => {
    assert.throws(() => decryptToken('v9:aGVsbG8='), /unsupported ciphertext version/)
  })

  it('rejects a weak passphrase key', () => {
    process.env.INTEGRATION_TOKEN_KEY = 'this-is-a-passphrase-and-not-a-hex-key'
    __resetCryptoKeyCacheForTests()
    assert.throws(() => encryptToken('anything'), /hex:|base64:/)
  })

  it('rejects a missing env var', () => {
    delete process.env.INTEGRATION_TOKEN_KEY
    __resetCryptoKeyCacheForTests()
    assert.throws(() => encryptToken('anything'), /not set/)
  })

  it('accepts a base64-encoded master key', () => {
    process.env.INTEGRATION_TOKEN_KEY = 'base64:AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8='
    __resetCryptoKeyCacheForTests()
    const plaintext = 'token'
    assert.equal(decryptToken(encryptToken(plaintext)), plaintext)
  })

  it('constantTimeEquals matches equal and rejects unequal', () => {
    assert.equal(constantTimeEquals('abc', 'abc'), true)
    assert.equal(constantTimeEquals('abc', 'abd'), false)
    assert.equal(constantTimeEquals('abc', 'abcd'), false)
  })
})
