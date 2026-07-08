'use client'

import { useMemo, useState } from 'react'
import type { NotificationCategory, NotificationListFilters } from '@/lib/hooks/use-notifications'
import { useDebouncedValue } from '../notifications-shared'
import { AlertsFilters } from './alerts-filters'
import { AlertsHeader } from './alerts-header'
import { AlertsList } from './alerts-list'
import { AlertsSearch } from './alerts-search'
import type { AlertStatusFilter } from './types'

export function AlertsView({ focusId }: { focusId: string | null }) {
  const [status, setStatus] = useState<AlertStatusFilter>('all')
  const [categories, setCategories] = useState<NotificationCategory[]>([])
  const [rawQuery, setRawQuery] = useState('')
  const debouncedQuery = useDebouncedValue(rawQuery, 250)

  const filters: NotificationListFilters = useMemo(() => {
    // Alerts surface = chat-category notifications EXCLUDED. If the user picks
    // specific categories from chips, use those (still excluding 'chat'); if
    // they pick none, default to the alert categories so the server doesn't
    // return chats. Computed inside the memo so a fresh array each render
    // doesn't churn the query key.
    const effectiveCategories =
      categories.length > 0
        ? categories.filter((c) => c !== 'chat')
        : (['report', 'compliance', 'task', 'system'] as NotificationCategory[])
    return {
      status,
      direction: 'inbox',
      category: effectiveCategories,
      q: debouncedQuery.trim() || undefined,
      pageSize: 30,
    }
  }, [status, categories, debouncedQuery])

  return (
    <>
      <AlertsHeader />
      <AlertsSearch query={rawQuery} onQueryChange={setRawQuery} />
      <AlertsFilters
        status={status}
        onStatusChange={setStatus}
        categories={categories}
        onCategoriesChange={setCategories}
      />
      <AlertsList filters={filters} focusId={focusId} />
    </>
  )
}
