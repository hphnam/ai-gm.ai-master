import { Skeleton } from '@/components/ui/skeleton'

/// Instant streamed fallback for the (app) route group while the layout's
/// requireAppAccess() server gate resolves. Approximates the AppShell: a
/// fixed-width sidebar rail plus a content column, so navigations don't flash
/// a blank screen.
export default function AppLoading() {
  return (
    <div className="flex h-dvh w-full bg-background">
      <aside className="hidden flex-col gap-2 border-r border-sidebar-border bg-sidebar p-3 md:flex md:w-[260px] md:shrink-0">
        <div className="flex items-center gap-2 px-2 pt-1 pb-1">
          <Skeleton className="h-4 w-12 bg-sidebar-accent" />
        </div>
        <Skeleton className="h-9 w-full bg-sidebar-accent" />
        <div className="mt-1 flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
            <Skeleton key={i} className="h-8 w-full bg-sidebar-accent" />
          ))}
        </div>
        <div className="flex-1" />
        <div className="border-t border-sidebar-border pt-2">
          <Skeleton className="h-8 w-full bg-sidebar-accent" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <Skeleton className="h-7 w-48" />
          <div className="mt-6 flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-9/12" />
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
