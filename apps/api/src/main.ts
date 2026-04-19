import './load-env'

import { NestFactory } from '@nestjs/core'
import { json } from 'express'
import { AppModule } from './app.module'
import { httpLoggerMiddleware } from './common/http-logger.middleware'
import { requestIdMiddleware } from './common/request-id.middleware'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

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
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-request-id'],
  })

  app.use(json({ limit: '32kb' }))
  app.use(requestIdMiddleware)
  app.use(httpLoggerMiddleware)

  app.enableShutdownHooks()

  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
