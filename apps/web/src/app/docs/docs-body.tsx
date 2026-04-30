'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Inbox, Library, MessageCircleQuestion, Upload } from 'lucide-react'
import { InboxTab, useInboxCount } from '@/components/docs/inbox-tab'
import { LibraryTab } from '@/components/docs/library-tab'
import { QuestionsTab, useQuestionsCount } from '@/components/docs/questions-tab'
import { KnowledgeEmptyState } from '@/components/docs/empty-state'
import { UploadModal } from '@/components/docs/upload-modal'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { useDocs } from '@/lib/hooks/use-docs'
import { cn } from '@/lib/utils'

type Tab = 'library' | 'inbox' | 'questions'
const TABS: Tab[] = ['library', 'inbox', 'questions']

function isTab(v: string | null): v is Tab {
  return v === 'library' || v === 'inbox' || v === 'questions'
}

function TabBar({
  active,
  onChange,
  inboxCount,
  questionsCount,
}: {
  active: Tab
  onChange: (t: Tab) => void
  inboxCount: number
  questionsCount: number
}) {
  const items: Array<{
    id: Tab
    label: string
    Icon: typeof Library
    count: number
    urgent?: boolean
  }> = [
    { id: 'library', label: 'Library', Icon: Library, count: 0 },
    { id: 'inbox', label: 'Inbox', Icon: Inbox, count: inboxCount, urgent: true },
    {
      id: 'questions',
      label: 'Questions',
      Icon: MessageCircleQuestion,
      count: questionsCount,
      urgent: true,
    },
  ]

  return (
    <div role="tablist" aria-label="Knowledge sections" className="mb-6 flex gap-1 border-b">
      {items.map(({ id, label, Icon, count, urgent }) => {
        const selected = active === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`tabpanel-${id}`}
            id={`tab-${id}`}
            onClick={() => onChange(id)}
            className={cn(
              'relative -mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors',
              selected
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{label}</span>
            {count > 0 ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                  selected
                    ? 'bg-foreground/10 text-foreground'
                    : urgent
                      ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function DocsBody() {
  const docs = useDocs()
  const inboxCount = useInboxCount()
  const questionsCount = useQuestionsCount()
  const [uploadOpen, setUploadOpen] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tabParam = params.get('tab')
  const tab: Tab = isTab(tabParam) ? tabParam : 'library'

  const setTab = (next: Tab) => {
    const sp = new URLSearchParams(params.toString())
    if (next === 'library') sp.delete('tab')
    else sp.set('tab', next)
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const totalDocs = docs.data?.length ?? 0
  const showFullEmpty = !docs.isLoading && totalDocs === 0

  return (
    <AppShell>
      <PageHeader
        title="Knowledge"
        description="Everything your AI assistant can answer about your venues."
        actions={
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="cursor-pointer gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Add document
          </Button>
        }
      />

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {showFullEmpty ? (
            <KnowledgeEmptyState onUploadClick={() => setUploadOpen(true)} />
          ) : (
            <>
              <TabBar
                active={tab}
                onChange={setTab}
                inboxCount={inboxCount}
                questionsCount={questionsCount}
              />

              {TABS.map((id) => (
                <div
                  key={id}
                  role="tabpanel"
                  id={`tabpanel-${id}`}
                  aria-labelledby={`tab-${id}`}
                  hidden={tab !== id}
                  className="min-w-0"
                >
                  {id === 'library' ? <LibraryTab /> : null}
                  {id === 'inbox' ? <InboxTab /> : null}
                  {id === 'questions' ? <QuestionsTab /> : null}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </AppShell>
  )
}
