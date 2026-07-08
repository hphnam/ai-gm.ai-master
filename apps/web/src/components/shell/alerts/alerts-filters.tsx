'use client'

import type { NotificationCategory } from '@/lib/hooks/use-notifications'
import { ALERT_CATEGORY_ORDER, CATEGORY_LABELS, CategoryIcon } from '../notifications-shared'
import { Chip } from './chip'
import type { AlertStatusFilter } from './types'

export function AlertsFilters({
  status,
  onStatusChange,
  categories,
  onCategoriesChange,
}: {
  status: AlertStatusFilter
  onStatusChange: (s: AlertStatusFilter) => void
  categories: NotificationCategory[]
  onCategoriesChange: (c: NotificationCategory[]) => void
}) {
  function toggleCategory(c: NotificationCategory) {
    onCategoriesChange(
      categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c],
    )
  }
  return (
    <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b border-border px-4 py-2.5">
      <Chip active={status === 'all'} onClick={() => onStatusChange('all')} label="All" />
      <Chip active={status === 'unread'} onClick={() => onStatusChange('unread')} label="Unread" />
      <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
      {ALERT_CATEGORY_ORDER.map((c) => (
        <Chip
          key={c}
          active={categories.includes(c)}
          onClick={() => toggleCategory(c)}
          label={CATEGORY_LABELS[c]}
          icon={<CategoryIcon category={c} className="h-3 w-3" />}
        />
      ))}
    </div>
  )
}
