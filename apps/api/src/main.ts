import './load-env'

import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { json, raw as rawParser, type NextFunction, type Request, type Response } from 'express'
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
  // 03-04 audit-added M6 (G6) — Middleware order contract: webhook-path branches MUST run
  // BEFORE jsonDefault. Drift = 403 on every inbound because req.rawBody would be missing.
  // Do NOT reorder without re-validating the HMAC flow end-to-end against Infobip.
  //
  // Infobip posts application/json; we use express.raw() to preserve the raw body bytes on
  // req.rawBody so the HMAC-SHA256 guard can verify the signature, then we JSON.parse
  // ourselves into req.body so the controller sees a parsed payload. The Content-Type
  // allowlist tolerates parameterized variants (e.g. "application/json; charset=utf-8").
  const jsonDefault = json({ limit: '32kb' })
  const webhookRaw = rawParser({
    limit: '32kb',
    type: ['application/json', 'application/*+json'],
  })
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/docs/upload') return next()
    if (req.path === '/webhooks/infobip/whatsapp') {
      return webhookRaw(req, res, (err) => {
        if (err) return next(err)
        const buf: Buffer | undefined = req.body instanceof Buffer ? req.body : undefined
        if (!buf || buf.length === 0) {
          req.rawBody = Buffer.alloc(0)
          req.body = {}
          return next()
        }
        req.rawBody = buf
        try {
          req.body = JSON.parse(buf.toString('utf8'))
        } catch {
          req.body = {}
        }
        next()
      })
    }
    return jsonDefault(req, res, next)
  })

  // 03-04 audit-added M6 (G6) — middleware-order contract enforcement:
  //   The /webhooks/infobip/whatsapp branch above MUST run before jsonDefault to populate
  //   req.rawBody for HMAC verification. Drift = 403 on every inbound.
  //
  //   Original audit recommended runtime Express router introspection but it's brittle
  //   across Express 4/5 (_router vs router lazy-init semantics) and SWC-compiled source.
  //   Fallback per the audit's own note: rely on this comment + a grep-based verification
  //   step. The contract is enforced by reading this file, not by runtime assertion.
  //
  //   VERIFY BEFORE DEPLOY:
  //     grep -n "webhooks/infobip/whatsapp" apps/api/src/main.ts  → must return 1 hit
  //     grep -n "req.rawBody = " apps/api/src/main.ts             → must return 1 hit
  //     End-to-end check: send a real Infobip Portal trial inbound; expect 200 + payload
  //     reaches the controller. 403 "no-raw-body" = middleware order broken.

  // Swagger / OpenAPI — served at /api-docs in dev for browsing, the same
  // document is emitted to swagger.json by `pnpm swagger:generate` for orval
  // codegen on the web side.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GM AI API')
    .setVersion('1.0')
    .build()
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api-docs', app, swaggerDoc)

  // Realtime fan-out across replicas. Same Redis instance BullMQ uses, no
  // extra infra dep. Done after createDocument so swagger setup is unaffected.
  const redisAdapter = new RedisIoAdapter(
    app,
    process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  )
  await redisAdapter.connectToRedis()
  app.useWebSocketAdapter(redisAdapter)

  app.enableShutdownHooks()

  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
