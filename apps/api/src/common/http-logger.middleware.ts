import { Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

const logger = new Logger('http')

const AUTH_PATH = /^\/api\/auth(\/|$)/

// audit-added M7: redaction contract.
//   - /api/auth/* body + query are NEVER logged (field names OR values).
//   - Cookie / Authorization / Set-Cookie header values are NEVER logged raw.
//   - For ALL paths: log only structural fields — method, path, status, latency,
//     requestId, ip. No body/query values.
export function httpLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now()
  const requestId = (req as Request & { requestId?: string }).requestId ?? null
  const isAuthRoute = AUTH_PATH.test(req.path)
  res.on('finish', () => {
    logger.log(
      JSON.stringify({
        event: 'http.request',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        latencyMs: Date.now() - startedAt,
        ip: req.ip ?? null,
        auth: isAuthRoute ? 'redacted' : undefined,
      }),
    )
  })
  next()
}
