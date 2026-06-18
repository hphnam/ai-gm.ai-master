import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

/// Symmetric encryption for stored integration credentials.
///
/// Format on disk (versioned so future key/cipher rotations are non-breaking):
///   v1:base64(salt ‖ iv ‖ ciphertext ‖ tag)
///   - salt:       16 bytes, per-record, random
///   - iv:         12 bytes, per-record, random
///   - ciphertext: variable, AES-256-GCM
///   - tag:        16 bytes, GCM auth tag
///
/// Per-record salt + HKDF-Expand derives a unique encryption key per record
/// from a single master key. Compromising one record's derived key does not
/// reveal the master or other records' keys. We use HKDF (not raw key reuse)
/// to follow NIST 800-108 guidance even though our master key is already
/// uniformly random.
///
/// Master key sourcing: INTEGRATION_TOKEN_KEY MUST be either
///   • `hex:<64 hex chars>`  (32-byte key)
///   • `base64:<44 base64 chars>` (32-byte key)
/// Anything else throws at first use. We refuse to derive a key from a raw
/// passphrase — a high-entropy 32-byte key generated with a CSPRNG is
/// non-negotiable. The CLI snippet to mint one is in the error message.
const ALG = 'aes-256-gcm'
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32
const HKDF_INFO = Buffer.from('gm-ai/integration-token/v1', 'utf8')
const CURRENT_VERSION = 'v1'

let cachedMasterKey: Buffer | null = null

function parseMasterKey(raw: string): Buffer {
  const trimmed = raw.trim()
  if (trimmed.startsWith('hex:')) {
    const hex = trimmed.slice(4).trim()
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error(
        'INTEGRATION_TOKEN_KEY: "hex:" prefix must be followed by 64 hex chars (32 bytes). Generate with: openssl rand -hex 32',
      )
    }
    return Buffer.from(hex, 'hex')
  }
  if (trimmed.startsWith('base64:')) {
    const b64 = trimmed.slice(7).trim()
    const buf = Buffer.from(b64, 'base64')
    if (buf.length !== KEY_LEN) {
      throw new Error(
        'INTEGRATION_TOKEN_KEY: "base64:" prefix must decode to exactly 32 bytes. Generate with: openssl rand -base64 32',
      )
    }
    return buf
  }
  throw new Error(
    'INTEGRATION_TOKEN_KEY must start with "hex:" or "base64:" followed by a 32-byte key. ' +
      'Generate with: openssl rand -hex 32 (and set INTEGRATION_TOKEN_KEY=hex:<output>). ' +
      'Raw passphrases are NOT accepted — the key must be a CSPRNG-generated 32-byte value.',
  )
}

function getMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey
  const raw = process.env.INTEGRATION_TOKEN_KEY
  if (!raw) {
    throw new Error(
      'INTEGRATION_TOKEN_KEY is not set. Generate one with: openssl rand -hex 32, then set INTEGRATION_TOKEN_KEY=hex:<output> in apps/api/.env',
    )
  }
  cachedMasterKey = parseMasterKey(raw)
  return cachedMasterKey
}

function deriveRecordKey(salt: Buffer): Buffer {
  const master = getMasterKey()
  // hkdfSync returns ArrayBuffer; wrap into a Buffer view for createCipheriv.
  const derived = hkdfSync('sha256', master, salt, HKDF_INFO, KEY_LEN)
  return Buffer.from(derived)
}

export function encryptToken(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encryptToken: plaintext must be a non-empty string')
  }
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = deriveRecordKey(salt)
  const cipher = createCipheriv(ALG, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([salt, iv, enc, tag]).toString('base64')
  return `${CURRENT_VERSION}:${payload}`
}

export function decryptToken(ciphertext: string): string {
  const sep = ciphertext.indexOf(':')
  if (sep === -1) {
    throw new Error(
      'decryptToken: missing version prefix — refuse to decrypt legacy / unversioned ciphertext',
    )
  }
  const version = ciphertext.slice(0, sep)
  const payload = ciphertext.slice(sep + 1)
  if (version !== CURRENT_VERSION) {
    throw new Error(`decryptToken: unsupported ciphertext version "${version}"`)
  }
  const buf = Buffer.from(payload, 'base64')
  if (buf.length < SALT_LEN + IV_LEN + TAG_LEN + 1) {
    throw new Error('decryptToken: ciphertext too short — corrupted or wrong key')
  }
  const salt = buf.subarray(0, SALT_LEN)
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN)
  const tag = buf.subarray(buf.length - TAG_LEN)
  const enc = buf.subarray(SALT_LEN + IV_LEN, buf.length - TAG_LEN)
  const key = deriveRecordKey(salt)
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  // .final() throws (via Node's constant-time GCM verifier) if the tag
  // doesn't match. We don't need an explicit timingSafeEqual here — the
  // import below is retained for future-proofing when we add a separate
  // ciphertext-integrity check (e.g. an HMAC over (version ‖ salt ‖ iv)
  // for cross-format-rotation scenarios).
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

/// Side-channel-safe equality for opaque secret comparisons that future
/// callers might need (e.g. comparing a stored hash against an inbound
/// webhook signature). Constant-time over the longer of the two inputs.
export function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  // timingSafeEqual requires equal-length inputs — pad the shorter one to
  // the longer's length with a single fixed byte. Length disclosure is
  // unavoidable but acceptable; the content comparison stays constant-time.
  if (aBuf.length !== bBuf.length) {
    const filler = Buffer.alloc(Math.max(aBuf.length, bBuf.length))
    aBuf.copy(filler, 0, 0, Math.min(aBuf.length, filler.length))
    timingSafeEqual(filler, filler)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

/// Test-only escape hatch — resets the cached key so a unit test can swap
/// INTEGRATION_TOKEN_KEY between assertions. Never call in production code.
export function __resetCryptoKeyCacheForTests(): void {
  cachedMasterKey = null
}
