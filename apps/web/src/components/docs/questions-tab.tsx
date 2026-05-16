'use client'

import { MessageCircleQuestion } from 'lucide-react'
import { GapList } from '@/components/docs/gap-list'
import { NoDataQueriesPanel } from '@/components/docs/no-data-queries-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useGaps, useNoDataQueries } from '@/lib/hooks/use-docs'

export function useQuestionsCount(): number {
  const gaps = useGaps()
  return gaps.data?.length ?? 0
}

const QUESTIONS_SKELETON_KEYS = ['a', 'b', 'c']

function EmptyQuestions() {
  return (
    <EmptyState
      icon={MessageCircleQuestion}
      title="Nothing to answer right now"
      description="When staff ask the AI something it can’t find, it’ll show up here for you to weigh in on."
    />
  )
}

export function QuestionsTab() {
  const gaps = useGaps()
  const noData = useNoDataQueries()

  if (gaps.isLoading && noData.isLoading) {
    return (
      <div className="space-y-3">
        {QUESTIONS_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  const gapsList = gaps.data ?? []
  const noDataList = noData.data ?? []
  const nothing = gapsList.length === 0 && noDataList.length === 0

  if (nothing) return <EmptyQuestions />

  return (
    <div className="space-y-6">
      {gapsList.length > 0 ? <GapList gaps={gapsList} /> : null}
      {noDataList.length > 0 ? (
        <section aria-labelledby="no-data-heading" className="space-y-2">
          <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1">
            <h3 id="no-data-heading" className="text-sm font-semibold tracking-tight">
              Searches with no results
            </h3>
            <span className="text-xs text-muted-foreground">
              {noDataList.length} unique · last 30 days · add the useful ones to your questions
            </span>
          </header>
          <NoDataQueriesPanel queries={noDataList} />
        </section>
      ) : null}
    </div>
  )
}
