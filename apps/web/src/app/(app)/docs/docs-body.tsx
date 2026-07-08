'use client'

import { Inbox, Library, MessageCircleQuestion, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KnowledgeEmptyState } from '@/components/docs/empty-state'
import { InboxTab, useInboxCount } from '@/components/docs/inbox-tab'
import { LibraryTab } from '@/components/docs/library-tab'
import { QuestionsTab, useQuestionsCount } from '@/components/docs/questions-tab'
import { UploadModal } from '@/components/docs/upload-modal'
import { SetPageHeader } from '@/components/shell/page-header-provider'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/ui/page-container'
import { type TabItem, TabPanel, Tabs } from '@/components/ui/tabs'
import { useDocsTotal } from '@/lib/hooks/use-docs'

export type DocsTab = 'library' | 'inbox' | 'questions'

const TABS: DocsTab[] = ['library', 'inbox', 'questions']

const TAB_HREF: Record<DocsTab, string> = {
  library: '/docs',
  inbox: '/docs/inbox',
  questions: '/docs/questions',
}

export function DocsBody({ tab = 'library' }: { tab?: DocsTab }) {
  // Drives the "no docs at all" empty state. Reuses the Library tab's
  // default-filter list query (shared cache key) and selects just the total,
  // so this reflects the whole org's library without a second request.
  const docsTotal = useDocsTotal()
  const inboxCount = useInboxCount()
  const questionsCount = useQuestionsCount()
  const [uploadOpen, setUploadOpen] = useState(false)

  const totalDocs = docsTotal.data ?? 0
  const showFullEmpty = !docsTotal.isLoading && totalDocs === 0

  const tabItems = useMemo<TabItem<DocsTab>[]>(
    () => [
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
    ],
    [inboxCount, questionsCount],
  )

  return (
    <>
      <SetPageHeader
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
        <PageContainer width="content">
          {showFullEmpty ? (
            <KnowledgeEmptyState onUploadClick={() => setUploadOpen(true)} />
          ) : (
            <>
              <Tabs items={tabItems} value={tab} ariaLabel="Knowledge sections" hasPanels />

              {TABS.map((id) => (
                <TabPanel key={id} id={id} active={tab === id}>
                  {id === 'library' ? <LibraryTab /> : null}
                  {id === 'inbox' ? <InboxTab /> : null}
                  {id === 'questions' ? <QuestionsTab /> : null}
                </TabPanel>
              ))}
            </>
          )}
        </PageContainer>
      </div>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  )
}
