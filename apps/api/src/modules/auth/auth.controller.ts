import { All, Controller, Req, Res } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth.config'

const nodeHandler = toNodeHandler(auth)

@ApiExcludeController()
@Controller('api/auth')
export class AuthController {
  @All('*path')
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    await nodeHandler(req, res)
  }
}
