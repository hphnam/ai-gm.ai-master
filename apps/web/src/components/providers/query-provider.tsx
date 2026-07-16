'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/get-query-client'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // getQueryClient() returns the stable browser singleton on the client, so no
  // useState is needed. Config + the server/browser split live in
  // get-query-client.ts, shared with the RSC prefetch harness.
  const client = getQueryClient()

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
