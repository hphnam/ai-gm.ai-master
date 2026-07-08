'use client'

import { PageHeaderView } from './page-header'
import { usePageHeaderConfig } from './page-header-provider'

// Slot-side view for routes whose title/actions are pushed up from the content
// via <SetPageHeader/>. The fallback title paints instantly (before the body's
// effect runs) so there's no empty-header flash on first load.
export function DynamicPageHeader({ fallbackTitle }: { fallbackTitle: string }) {
  const { title, description, actions } = usePageHeaderConfig()
  return (
    <PageHeaderView title={title ?? fallbackTitle} description={description} actions={actions} />
  )
}
