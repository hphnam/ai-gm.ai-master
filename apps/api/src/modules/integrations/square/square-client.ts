import { createHash } from 'node:crypto'
import { SquareClient, SquareEnvironment } from 'square'

/// Per-org Square client factory. We cache by (orgId|env|hash(token)) so a
/// single org re-uses the same client across many chat turns within a
/// process; rotating the PAT invalidates the cache because the hash changes.
///
/// The token is hashed (SHA-256, hex) into the cache key — never the raw
/// prefix. Two PATs sharing a prefix and length would otherwise collide,
/// and a leaked cache key would not reveal any portion of the underlying
/// token.
///
/// SquareClient is cheap to construct (no network), so a Map is fine. Bounded
/// to 256 entries; LRU-evicted by insertion order — keeps us safe against
/// memory growth in a multi-tenant single-node deployment.
const CACHE_MAX = 256
const cache = new Map<string, SquareClient>()

function fingerprintToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex').slice(0, 32)
}

export function getSquareClient(input: {
  orgId: string
  accessToken: string
  environment: 'production' | 'sandbox' | string
}): SquareClient {
  const env =
    input.environment === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production
  const key = `${input.orgId}|${env}|${fingerprintToken(input.accessToken)}`
  const existing = cache.get(key)
  if (existing) {
    // Touch — move to end so LRU eviction skips it.
    cache.delete(key)
    cache.set(key, existing)
    return existing
  }
  const client = new SquareClient({ token: input.accessToken, environment: env })
  cache.set(key, client)
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  return client
}

/// JSON-safe replacer for BigInt fields the Square SDK returns (money amounts
/// in particular). Stringifies values that don't fit a safe JS number, leaves
/// the rest as plain numbers so the chat agent's downstream prompt math
/// behaves normally.
export function bigIntToNumberOrString(value: bigint): number | string {
  if (value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)) {
    return Number(value)
  }
  return value.toString()
}

/// Square stores money as integer minor units (pence/cents). 2-decimal
/// currencies are the common case (GBP, EUR, USD); zero-decimal currencies
/// (JPY, KRW) ship `amount` already in major units. The agent surfaces money
/// in major units to the user so we normalise here.
export function formatMoney(
  money:
    | {
        amount?: bigint | number | null
        currency?: string | null
      }
    | null
    | undefined,
): { value: number; currency: string } | null {
  if (money == null || money.amount == null) return null
  const raw = typeof money.amount === 'bigint' ? bigIntToNumberOrString(money.amount) : money.amount
  if (typeof raw !== 'number') return null
  const currency = money.currency ?? 'GBP'
  const zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency)
  return {
    value: zeroDecimal ? raw : raw / 100,
    currency,
  }
}

export const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY',
  'KRW',
  'VND',
  'CLP',
  'PYG',
  'UGX',
  'RWF',
  'XAF',
  'XOF',
])
