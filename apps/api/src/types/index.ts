import { z } from 'zod'

export const healthCheckSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
})

export type HealthCheck = z.infer<typeof healthCheckSchema>

export * from './adaptation'
export * from './api'
export * from './auth'
export * from './chat-core'
export * from './chat-tools'
export * from './cost'
export * from './debug'
export * from './docs'
export * from './knowledge-metadata'
export * from './proactive-suggestion'
export * from './reports'
export * from './section'
export * from './tabular'
export * from './tool-result'
export * from './whatsapp'
export * from './whatsapp-invite'
