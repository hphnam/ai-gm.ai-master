import './load-env'

import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { json, type NextFunction, type Request, type Response, urlencoded } from 'express'
import { AppModule } from './app.module'
import { httpLoggerMiddleware } from './common/http-logger.middleware'
import { requestIdMiddleware } from './common/request-id.middleware'
import { securityHeadersMiddleware } from './common/security-headers.middleware'
import { assertAuthEnv } from './modules/auth/assert-auth-env'
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter'

async function bootstrap() {
  // audit-added M8: fail-fast startup — missing/malformed BETTER_AUTH_* + WEB_ORIGIN exit 1
  assertAuthEnv()

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    rawBody: false,
  })

  const allowlist = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (!origin) return cb(null, true)
      if (allowlist.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-request-id'],
  })

  // Middleware order (DO NOT REORDER — breaks request-id/logger/body-cap contracts):
  //   1) request-id        — stamps X-Request-Id
  //   2) security-headers  — nosniff/frameguard
  //   3) http-logger       — reads requestId; redacts /api/auth/*
  //   4) body caps         — 8 KB on /api/auth/*, 32 KB elsewhere
  //   5) (NestJS) AuthGuard via @UseGuards → OrgContextMiddleware → handlers
  app.use(requestIdMiddleware)
  app.use(securityHeadersMiddleware)
  app.use(httpLoggerMiddleware)

  // audit-added M9: tight 8 KB cap on /api/auth/*, 32 KB default elsewhere.
  app.use('/api/auth', json({ limit: '8kb' }))
  // 01-03 audit-added S10: phoneNumber + 6-digit code fits in <100 bytes; 2 KB cap blunts payload abuse.
  app.use('/auth/phone', json({ limit: '2kb' }))
  // 02-02 audit-added M5/S4: path-filtered 32 KB json parser; /docs/upload must reach multer
  // with its multipart body intact. Hoisted jsonDefault avoids per-request middleware construction.
  //
  // 03-06 Body-parser routing:
  //   - /docs/upload: passthrough so multer sees multipart intact.
  //   - /webhooks/twilio/conversations: application/x-www-form-urlencoded.
  //     Twilio's signature algorithm signs the URL + sorted form params, so we
  //     don't need raw-body retention — the guard reads the parsed body.
  //   - Everything else: json({ limit: '32kb' }).
  const jsonDefault = json({ limit: '32kb' })
  const twilioUrlencoded = urlencoded({ extended: false, limit: '32kb' })
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/docs/upload') return next()
    if (req.path === '/webhooks/twilio/conversations') {
      return twilioUrlencoded(req, res, next)
    }
    return jsonDefault(req, res, next)
  })

  // 03-06 middleware-order contract:
  //   /webhooks/twilio/conversations MUST be parsed as urlencoded BEFORE
  //   jsonDefault sees it. Drift = empty req.body → signature mismatch.
  //   VERIFY BEFORE DEPLOY:
  //     grep -n "webhooks/twilio/conversations" apps/api/src/main.ts   → must return 1 hit
  //     End-to-end: post a Twilio test event; expect 200 (or debug "event_skipped" log).

  // Swagger / OpenAPI — served at /api-docs in dev for browsing, the same
  // document is emitted to swagger.json by `npm run swagger:generate --workspace=api` for orval
  // codegen on the web side.
  const swaggerConfig = new DocumentBuilder().setTitle('GM AI API').setVersion('1.0').build()
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api-docs', app, swaggerDoc)

  // Realtime fan-out across replicas. Same Redis instance BullMQ uses, no
  // extra infra dep. Done after createDocument so swagger setup is unaffected.
  const redisAdapter = new RedisIoAdapter(app, process.env.REDIS_URL ?? 'redis://127.0.0.1:6379')
  await redisAdapter.connectToRedis()
  app.useWebSocketAdapter(redisAdapter)

  app.enableShutdownHooks()

  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
