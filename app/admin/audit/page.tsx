import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { requireAdmin } from '@/lib/actions/guard'
import { roleHome } from '@/lib/helper'
import { getAuditLogs } from '@/lib/actions/audit'
import { PageLabel } from '@/components/globals/PageLabel'
import AuditClient from '@/components/admin/audit/AuditClient'

export default async function AdminAuditPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const adminSession = await requireAdmin()
  if (!adminSession) {
    redirect(roleHome((session.user as unknown as { role?: string })?.role))
  }

  const initial = await getAuditLogs({ page: 1, perPage: 20 })

  const logs = initial.success ? (initial.logs as never[]) : []
  const totalCount = initial.totalCount ?? 0
  const totalPages = initial.totalPages ?? 1

  return (
    <section className="flex flex-col w-full h-full min-h-0 overflow-hidden">
      <PageLabel label="Audit Log" />

      <AuditClient initialLogs={logs as never} initialTotalCount={totalCount} initialTotalPages={totalPages} initialPerPage={20} />
    </section>
  )
}
