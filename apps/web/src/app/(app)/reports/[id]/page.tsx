import { ReportDetailBody } from './report-detail-body'

export const dynamic = 'force-dynamic'

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReportDetailBody id={id} />
}
