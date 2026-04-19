'use client'

import { UserMenu } from '@/components/auth/user-menu'
import { DocForm } from '@/components/docs/doc-form'
import { DocList } from '@/components/docs/doc-list'
import { useDocs } from '@/lib/hooks/use-docs'

export function DocsBody() {
  const docs = useDocs()
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-lg font-semibold">Knowledge docs</h1>
          <p className="text-xs text-muted-foreground">
            Add procedures, checklists, supplier notes — the chat retrieves against this.
          </p>
        </div>
        <UserMenu />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <section aria-label="Existing docs" className="min-w-0">
          <h2 className="text-sm font-semibold mb-3">Existing docs</h2>
          <DocList docs={docs.data} isLoading={docs.isLoading} />
        </section>
        <aside aria-label="Add doc" className="min-w-0">
          <h2 className="text-sm font-semibold mb-3">Add doc</h2>
          <DocForm />
        </aside>
      </div>
    </main>
  )
}
