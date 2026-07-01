import type { INestApplicationContext } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { ServerOptions } from 'socket.io'
import { parseRedisUrl } from '../../redis-connection'

// Wraps NestJS's default socket.io adapter with @socket.io/redis-adapter so
// emits fan out across every API replica connected to the same Redis. Same
// REDIS_URL the BullMQ pool uses — one shared infra dep, no extra config.
//
// We use two separate clients per the socket.io-redis-adapter contract: one
// publishes, one subscribes. That's a hard requirement of the redis pub/sub
// protocol, not a knob.
// Cap the boot-time wait for Redis. Without it, an unreachable Redis leaves the
// 'ready' event pending forever, main.ts never reaches app.listen(), the health
// check never passes, and the deploy rolls back. A bounded wait lets boot fall
// through to single-node mode (ioredis keeps reconnecting in the background)
// instead of hanging the whole process.
const REDIS_READY_TIMEOUT_MS = 10_000

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name)
  private pubClient: Redis | null = null
  private subClient: Redis | null = null
  private adapter: ReturnType<typeof createAdapter> | null = null

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
  ) {
    super(app)
  }

  async connectToRedis(): Promise<void> {
    if (this.adapter) return

    const redisOptions = {
      ...parseRedisUrl(this.redisUrl),
      // Reconnect aggressively in dev/prod; ioredis backs off automatically.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }

    this.pubClient = new Redis(redisOptions)
    this.subClient = this.pubClient.duplicate()

    this.pubClient.on('error', (err) => this.logger.error(`redis pub error: ${err.message}`))
    this.subClient.on('error', (err) => this.logger.error(`redis sub error: ${err.message}`))

    // Wait for both clients to be ready so we don't race the first emit — but
    // never longer than REDIS_READY_TIMEOUT_MS. On timeout, tear the clients
    // down (disconnect() stops reconnection immediately — no orphaned sockets)
    // and throw so the caller can boot in single-node mode rather than block.
    try {
      await Promise.all([this.waitReady(this.pubClient), this.waitReady(this.subClient)])
    } catch (err) {
      this.pubClient.disconnect()
      this.subClient.disconnect()
      this.pubClient = null
      this.subClient = null
      throw err
    }

    this.adapter = createAdapter(this.pubClient, this.subClient, {
      key: 'gm-ai-socket',
    })
    this.logger.log('redis socket.io adapter connected')
  }

  private waitReady(client: Redis): Promise<void> {
    if (client.status === 'ready') return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        client.off('ready', onReady)
        reject(new Error(`redis not ready within ${REDIS_READY_TIMEOUT_MS}ms`))
      }, REDIS_READY_TIMEOUT_MS)
      const onReady = () => {
        clearTimeout(timer)
        resolve()
      }
      client.once('ready', onReady)
    })
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options) as {
      adapter: (a: unknown) => unknown
    }
    if (this.adapter) server.adapter(this.adapter)
    return server
  }

  async dispose(): Promise<void> {
    await Promise.allSettled([this.pubClient?.quit(), this.subClient?.quit()])
    this.pubClient = null
    this.subClient = null
    this.adapter = null
  }
}
