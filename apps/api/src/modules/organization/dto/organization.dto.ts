import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { OrganizationProfileSchema, UpdateOrganizationProfileSchema } from '../../../types'

export class UpdateOrganizationProfileDto extends createZodDto(UpdateOrganizationProfileSchema) {}

export const OrganizationProfileResponseSchema = z.object({
  profile: OrganizationProfileSchema,
})
export class OrganizationProfileResponseDto extends createZodDto(
  OrganizationProfileResponseSchema,
) {}
