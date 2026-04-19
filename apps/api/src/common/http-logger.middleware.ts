import { Logger } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'

const logger = new Logger('http')

export function httpLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now()
  const requestId = (req as Request & { requestId?: string }).requestId ?? null
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
      }),
    )
  })
  next()
}
