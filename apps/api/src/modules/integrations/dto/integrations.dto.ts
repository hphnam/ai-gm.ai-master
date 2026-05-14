import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const ProviderParamSchema = z.object({
  provider: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/, 'provider must be lowercase alphanumeric'),
})
export class ProviderParamDto extends createZodDto(ProviderParamSchema) {}

/// PAT path. accessToken is bounded so an attacker can't push a multi-MB body;
/// Square PATs in practice are ~64 chars. We keep the ceiling generous to
/// accommodate other providers that issue long tokens.
export const ConnectPatBodySchema = z.object({
  accessToken: z.string().trim().min(8).max(2048),
  environment: z.enum(['production', 'sandbox']).optional(),
  scopes: z.array(z.string().min(1).max(120)).max(40).optional(),
  externalAccountId: z.string().min(1).max(200).optional(),
})
export class ConnectPatBodyDto extends createZodDto(ConnectPatBodySchema) {}

export const IntegrationSummarySchema = z.object({
  provider: z.string(),
  status: z.enum(['active', 'disconnected', 'error']),
  authMode: z.enum(['pat', 'oauth']),
  environment: z.string(),
  scopes: z.array(z.string()),
  externalAccountId: z.string().nullable(),
  lastError: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  connectedAt: z.string(),
})
export class IntegrationSummaryDto extends createZodDto(IntegrationSummarySchema) {}

export const ListIntegrationsResponseSchema = z.object({
  integrations: z.array(IntegrationSummarySchema),
})
export class ListIntegrationsResponseDto extends createZodDto(ListIntegrationsResponseSchema) {}

export const SingleIntegrationResponseSchema = z.object({
  integration: IntegrationSummarySchema,
})
export class SingleIntegrationResponseDto extends createZodDto(SingleIntegrationResponseSchema) {}
