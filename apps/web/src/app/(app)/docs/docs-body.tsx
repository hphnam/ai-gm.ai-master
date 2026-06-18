'use client'

import { Inbox, Library, MessageCircleQuestion, Upload } from 'lucide-react'
import { useState } from 'react'
import { KnowledgeEmptyState } from '@/components/docs/empty-state'
import { InboxTab, useInboxCount } from '@/components/docs/inbox-tab'
import { LibraryTab } from '@/components/docs/library-tab'
import { QuestionsTab, useQuestionsCount } from '@/components/docs/questions-tab'
import { UploadModal } from '@/components/docs/upload-modal'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { type TabItem, TabPanel, Tabs } from '@/components/ui/tabs'
import { useDocs } from '@/lib/hooks/use-docs'

export type DocsTab = 'library' | 'inbox' | 'questions'

const TABS: DocsTab[] = ['library', 'inbox', 'questions']

const TAB_HREF: Record<DocsTab, string> = {
  library: '/docs',
  inbox: '/docs/inbox',
  questions: '/docs/questions',
}

export function DocsBody({ tab = 'library' }: { tab?: DocsTab }) {
  // First-page peek to drive the "no docs at all" empty state. Filters stay
  // at defaults so `total` reflects the whole org's library, not the
  // currently-filtered view (the Library tab handles that itself).
  const docs = useDocs()
  const inboxCount = useInboxCount()
  const questionsCount = useQuestionsCount()
  const [uploadOpen, setUploadOpen] = useState(false)

  const totalDocs = docs.data?.pages[0]?.total ?? 0
  const showFullEmpty = !docs.isLoading && totalDocs === 0

  return (
    <AppShell>
      <PageHeader
        title="Knowledge"
        description="Everything your AI assistant can answer about your venues."
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)} className="cursor-pointer gap-1.5">
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
              <Tabs
                items={
                  [
                    { id: 'library', label: 'Library', icon: Library, href: TAB_HREF.library },
                    {
                      id: 'inbox',
                      label: 'Inbox',
                      icon: Inbox,
                      count: inboxCount,
                      urgent: inboxCount > 0,
                      href: TAB_HREF.inbox,
                    },
                    {
                      id: 'questions',
                      label: 'Questions',
                      icon: MessageCircleQuestion,
                      count: questionsCount,
                      urgent: questionsCount > 0,
                      href: TAB_HREF.questions,
                    },
                  ] as TabItem<DocsTab>[]
                }
                value={tab}
                ariaLabel="Knowledge sections"
                hasPanels
              />

              {TABS.map((id) => (
                <TabPanel key={id} id={id} active={tab === id}>
                  {id === 'library' ? <LibraryTab /> : null}
                  {id === 'inbox' ? <InboxTab /> : null}
                  {id === 'questions' ? <QuestionsTab /> : null}
                </TabPanel>
              ))}
            </>
          )}
        </div>
      </div>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </AppShell>
  )
}
