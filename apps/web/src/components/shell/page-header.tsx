'use client'

import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppShell } from './app-shell'

type Props = {
  title: string
  description?: string
  actions?: React.ReactNode
  border?: boolean
}

export function PageHeader({ title, description, actions, border = true }: Props) {
  const { openMobileSidebar } = useAppShell()
  return (
    <header
      className={cn(
        'flex items-center gap-3 px-4 py-3 sm:px-6',
        border && 'border-b border-border',
      )}
    >
      <button
        type="button"
        onClick={openMobileSidebar}
        aria-label="Open sidebar"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
          {title}
        </h1>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}
