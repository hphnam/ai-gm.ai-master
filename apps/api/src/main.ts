import './load-env'

import { NestFactory } from '@nestjs/core'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'
import { httpLoggerMiddleware } from './common/http-logger.middleware'
import { requestIdMiddleware } from './common/request-id.middleware'
import { securityHeadersMiddleware } from './common/security-headers.middleware'
import { assertAuthEnv } from './modules/auth/assert-auth-env'

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
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowlist.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-request-id'],
  })

  // Middleware order (DO NOT REORDER without updating probe-api + probe-auth):
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
  // 03-01: Twilio posts application/x-www-form-urlencoded; json parser would leave req.body empty
  // and break signature validation. Webhook path uses urlencoded parser instead.
  const jsonDefault = json({ limit: '32kb' })
  const webhookUrlencoded = urlencoded({ limit: '32kb', extended: false })
  app.use((req, res, next) => {
    if (req.path === '/docs/upload') return next()
    if (req.path === '/webhooks/twilio/whatsapp') return webhookUrlencoded(req, res, next)
    return jsonDefault(req, res, next)
  })

  app.enableShutdownHooks()

  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
