import { defaultShouldDehydrateQuery, isServer, QueryClient } from '@tanstack/react-query'

/// Canonical React Query config for the app. Used by both the client provider
/// (browser singleton) and every per-request server QueryClient the RSC
/// prefetch spins up, so hydrated data lands with the same freshness rules it
/// would have if the browser had fetched it.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        // Realtime sockets push freshness for the busy surfaces
        // (tasks/kb/compliance/notifications) and mutations invalidate the
        // rest, so the cache can stay "fresh" far longer than a blind poll
        // would — this keeps back-navigation instant instead of re-skeletoning,
        // and stops hydrated server data being refetched the instant it lands.
        staleTime: 60_000,
        gcTime: 30 * 60_000,
      },
      mutations: { retry: 0 },
      dehydrate: {
        // Also dehydrate still-pending queries so a prefetch that didn't fully
        // settle server-side still hands the client an in-flight promise rather
        // than nothing. We await prefetches, so this is belt-and-suspenders.
        shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === 'pending',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/// Server: a fresh client per call (never shared across requests). Browser: a
/// lazily-created singleton reused for the tab's lifetime.
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
