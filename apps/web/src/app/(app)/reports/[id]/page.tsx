import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { ReportDetailBody } from './report-detail-body'

export const dynamic = 'force-dynamic'

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession()
  if (!session) {
    const { id } = await params
    redirect(`/auth/sign-in?redirect=/reports/${id}`)
  }
  const { id } = await params
  return <ReportDetailBody id={id} />
}
