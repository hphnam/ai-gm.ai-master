import type { RedisOptions } from 'ioredis'

/// Parse a Redis URL into the connection options ioredis/BullMQ want. Accepts
/// redis:// and rediss:// (TLS). Falls back to localhost:6379 if env unset.
///
/// rejectUnauthorized is off for TLS because our Redis sits behind a Coolify
/// self-signed CA; verification would throw SELF_SIGNED_CERT_IN_CHAIN. Traffic
/// is still encrypted — we only skip chain verification on our own infra.
export function parseRedisUrl(raw: string): RedisOptions {
  try {
    const u = new URL(raw)
    const opts: RedisOptions = {
      host: u.hostname || '127.0.0.1',
      port: u.port ? Number(u.port) : 6379,
    }
    if (u.username) opts.username = decodeURIComponent(u.username)
    if (u.password) opts.password = decodeURIComponent(u.password)
    if (u.pathname && u.pathname !== '/') opts.db = Number(u.pathname.slice(1))
    if (u.protocol === 'rediss:') opts.tls = { rejectUnauthorized: false }
    return opts
  } catch {
    return { host: '127.0.0.1', port: 6379 }
  }
}
