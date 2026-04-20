import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common'
import type { Response } from 'express'
import type { ApiErrorResponse } from '@gm-ai/types'

@Catch(PayloadTooLargeException)
export class UploadPayloadTooLargeFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const body: ApiErrorResponse = { error: 'file-too-large' }
    res.status(413).json(body)
  }
}
