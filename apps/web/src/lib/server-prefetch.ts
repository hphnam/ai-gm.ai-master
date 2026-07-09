import 'server-only'
import { type DehydratedState, dehydrate } from '@tanstack/react-query'
import { makeQueryClient } from './get-query-client'
import type { QuerySpec } from './queries/keys'
import { serverApiFetch } from './server-api'

/// Prefetch a set of GET specs on the server and return dehydrated React Query
/// state to feed a `<HydrationBoundary>`. Each spec is fetched with forwarded
/// cookies; failures are swallowed by `prefetchQuery`, so one down endpoint
/// never blocks the others or the page. Runs the prefetches in parallel.
export async function dehydrateSpecs(specs: QuerySpec[]): Promise<DehydratedState> {
  const queryClient = makeQueryClient()
  await Promise.all(
    specs.map((spec) =>
      queryClient.prefetchQuery({
        queryKey: spec.queryKey,
        queryFn: () => serverApiFetch(spec.path),
      }),
    ),
  )
  return dehydrate(queryClient)
}
