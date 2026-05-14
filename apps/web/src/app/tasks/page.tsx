import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { TasksBody } from './tasks-body'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/tasks')
  return <TasksBody />
}
