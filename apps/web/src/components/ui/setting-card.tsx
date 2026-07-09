import { cn } from '@/lib/utils'

// The single card system for Settings. Replaces the hand-rolled
// `section.rounded-lg border bg-card` blocks so every settings surface reads as
// one consistent set of panels (title + optional description + body).

export function SettingCard({
  title,
  description,
  action,
  bodyClassName,
  className,
  children,
  ...props
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  bodyClassName?: string
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('rounded-xl border bg-card shadow-sm', className)} {...props}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('px-5 py-4', bodyClassName)}>{children}</div>
    </section>
  )
}

// A page-level heading + optional description, sitting above the cards.
export function SettingsPageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
