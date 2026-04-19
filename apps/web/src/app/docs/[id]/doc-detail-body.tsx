'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { UserMenu } from '@/components/auth/user-menu'
import { Button } from '@/components/ui/button'
import { useDoc } from '@/lib/hooks/use-docs'
import { ApiError } from '@/lib/api-client'

export function DocDetailBody({ id }: { id: string }) {
  const doc = useDoc(id)

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between border-b pb-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/docs">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All docs
          </Link>
        </Button>
        <UserMenu />
      </header>

      {doc.isLoading ? (
        <p className="text-sm text-muted-foreground italic">Loading doc…</p>
      ) : doc.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm">
            {doc.error instanceof ApiError && doc.error.code === 'not-found'
              ? 'Doc not found, or not accessible to your organization.'
              : 'Something went wrong loading this doc.'}
          </p>
        </div>
      ) : doc.data ? (
        <article className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold">
              {doc.data.title ?? doc.data.docType ?? 'Untitled'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {doc.data.venueName ? (
                <span className="px-1.5 py-0.5 rounded bg-muted">
                  {doc.data.venueName}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900">
                  Global
                </span>
              )}
              {doc.data.docType ? (
                <span className="px-1.5 py-0.5 rounded bg-muted font-mono uppercase tracking-wide">
                  {doc.data.docType}
                </span>
              ) : null}
              <span>
                Updated {new Date(doc.data.updatedAt).toLocaleString()}
              </span>
            </div>
            {doc.data.summary ? (
              <p className="text-sm text-muted-foreground">{doc.data.summary}</p>
            ) : null}
            {doc.data.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {doc.data.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </header>

          <section aria-label="Content" className="rounded-md border bg-card p-4">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
              {doc.data.content}
            </pre>
          </section>

          {Object.keys(doc.data.metadata).length > 0 ? (
            <details className="rounded-md border bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium">
                AI metadata (emergent keys)
              </summary>
              <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                {JSON.stringify(doc.data.metadata, null, 2)}
              </pre>
            </details>
          ) : null}
        </article>
      ) : null}
    </main>
  )
}
