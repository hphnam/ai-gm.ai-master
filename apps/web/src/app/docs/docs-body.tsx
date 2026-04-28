'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { DocList } from '@/components/docs/doc-list'
import { GapList } from '@/components/docs/gap-list'
import { NoDataQueriesPanel } from '@/components/docs/no-data-queries-panel'
import { UploadModal } from '@/components/docs/upload-modal'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { useDocs, useGaps, useNoDataQueries } from '@/lib/hooks/use-docs'

export function DocsBody() {
  const docs = useDocs()
  const gaps = useGaps()
  const noData = useNoDataQueries()
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <AppShell>
      <PageHeader
        title="Knowledge"
        description="Procedures, checklists, supplier notes — the chat retrieves against this."
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        }
      />

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          {noData.data && noData.data.length > 0 ? (
            <NoDataQueriesPanel queries={noData.data} />
          ) : null}
          {gaps.data && gaps.data.length > 0 ? <GapList gaps={gaps.data} /> : null}
          <section aria-label="Existing docs" className="min-w-0">
            <DocList docs={docs.data} isLoading={docs.isLoading} />
          </section>
        </div>
      </div>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </AppShell>
  )
}
