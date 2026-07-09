import 'server-only'
import { type DehydratedState, dehydrate } from '@tanstack/react-query'
import { makeQueryClient } from './get-query-client'
import { type QuerySpec, venuesListQuery } from './queries/keys'
import { serverApiFetch } from './server-api'

/// Prefetch a set of GET specs on the server and return dehydrated React Query
/// state to feed a `<HydrationBoundary>`. Each spec is fetched with forwarded
/// cookies; failures are swallowed by `prefetchQuery`, so one down endpoint
/// never blocks the others or the page. Runs the prefetches in parallel.
export async function dehydrateSpecs(specs: QuerySpec[]): Promise<DehydratedState> {
  const queryClient = makeQueryClient({ server: true })
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

/// Venues is a master-detail: the body defaults to editing the first venue, so
/// we seed the list AND prefetch that first venue's detail — otherwise the
/// editor sits behind its own skeleton after the list has already loaded. The
/// detail key (`['venues', id]`) mirrors `useVenue`.
export async function dehydrateVenues(): Promise<DehydratedState> {
  const queryClient = makeQueryClient({ server: true })
  const venues = await serverApiFetch<Array<{ id: string }>>(venuesListQuery.path).catch(() => null)
  if (venues) {
    queryClient.setQueryData(venuesListQuery.queryKey, venues)
    const firstId = venues[0]?.id
    if (firstId) {
      await queryClient.prefetchQuery({
        queryKey: ['venues', firstId],
        queryFn: () => serverApiFetch(`/venues/${firstId}`),
      })
    }
  }
  return dehydrate(queryClient)
}
