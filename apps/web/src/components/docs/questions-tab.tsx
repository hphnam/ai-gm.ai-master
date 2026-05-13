'use client'

import { MessageCircleQuestion } from 'lucide-react'
import { GapList } from '@/components/docs/gap-list'
import { NoDataQueriesPanel } from '@/components/docs/no-data-queries-panel'
import { useGaps, useNoDataQueries } from '@/lib/hooks/use-docs'

export function useQuestionsCount(): number {
  const gaps = useGaps()
  return gaps.data?.length ?? 0
}

function EmptyQuestions() {
  return (
    <div className="rounded-xl border border-dashed bg-card/40 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <MessageCircleQuestion className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-medium">Nothing to answer right now</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        When staff ask the AI something it can’t find, it’ll show up here for you to weigh in on.
      </p>
    </div>
  )
}

export function QuestionsTab() {
  const gaps = useGaps()
  const noData = useNoDataQueries()

  if (gaps.isLoading && noData.isLoading) {
    return <p className="px-1 text-sm italic text-muted-foreground">Loading questions…</p>
  }

  const gapsList = gaps.data ?? []
  const noDataList = noData.data ?? []
  const nothing = gapsList.length === 0 && noDataList.length === 0

  if (nothing) return <EmptyQuestions />

  return (
    <div className="space-y-6">
      {gapsList.length > 0 ? <GapList gaps={gapsList} /> : null}
      {noDataList.length > 0 ? (
        <section className="space-y-2">
          <header className="flex items-baseline gap-2 px-1">
            <h3 className="text-sm font-semibold tracking-tight">What staff couldn’t find</h3>
            <span className="text-xs text-muted-foreground">
              Searches that returned nothing — useful for spotting gaps in your knowledge base
            </span>
          </header>
          <NoDataQueriesPanel queries={noDataList} />
        </section>
      ) : null}
    </div>
  )
}
