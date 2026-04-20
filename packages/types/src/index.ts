import { z } from 'zod'

export const healthCheckSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
})

export type HealthCheck = z.infer<typeof healthCheckSchema>

export * from './knowledge-metadata'
export * from './tool-result'
export * from './chat-tools'
export * from './proactive-suggestion'
export * from './adaptation'
export * from './api'
export * from './debug'
export * from './auth'
export * from './docs'
export * from './whatsapp'
