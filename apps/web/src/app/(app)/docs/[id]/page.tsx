import { DocDetailBody } from './doc-detail-body'

export const dynamic = 'force-dynamic'

export default async function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DocDetailBody id={id} />
}
