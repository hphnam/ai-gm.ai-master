import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'

export class ZodValidationPipe<T extends ZodSchema> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value)
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'invalid-input',
        details: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      })
    }
    return parsed.data
  }
}

export const zodPipe = <T extends ZodSchema>(schema: T) => new ZodValidationPipe(schema)
