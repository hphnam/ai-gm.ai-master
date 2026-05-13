import type { INestApplicationContext } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { ServerOptions } from 'socket.io'

// Wraps NestJS's default socket.io adapter with @socket.io/redis-adapter so
// emits fan out across every API replica connected to the same Redis. Same
// REDIS_URL the BullMQ pool uses — one shared infra dep, no extra config.
//
// We use two separate clients per the socket.io-redis-adapter contract: one
// publishes, one subscribes. That's a hard requirement of the redis pub/sub
// protocol, not a knob.
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
      // Reconnect aggressively in dev/prod; ioredis backs off automatically.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }

    this.pubClient = new Redis(this.redisUrl, redisOptions)
    this.subClient = this.pubClient.duplicate()

    this.pubClient.on('error', (err) => this.logger.error(`redis pub error: ${err.message}`))
    this.subClient.on('error', (err) => this.logger.error(`redis sub error: ${err.message}`))

    // Wait for both clients to be ready so we don't race the first emit.
    await Promise.all([
      new Promise<void>((resolve) => this.pubClient!.once('ready', () => resolve())),
      new Promise<void>((resolve) => this.subClient!.once('ready', () => resolve())),
    ])

    this.adapter = createAdapter(this.pubClient, this.subClient, {
      key: 'gm-ai-socket',
    })
    this.logger.log('redis socket.io adapter connected')
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
