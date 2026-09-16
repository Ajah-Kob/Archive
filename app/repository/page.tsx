import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PageLabel } from '@/components/globals/PageLabel'
import { getRepositoryArchives } from '@/lib/actions/repository'
import { RepositoryClient } from '@/components/repository/RepositoryClient'

export default async function RepositoryPage() {
  const res = await getRepositoryArchives()
  const archives = res.success && res.payload ? res.payload : []

  // Client-side UI gating only — /repository stays public in proxy.ts,
  // enforcement lives in the server actions (requireAdmin).
  const session = await getServerSession(authOptions)
  const role = session?.user?.role as string | undefined
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'

  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Repository" />
      <RepositoryClient archives={archives} isAdmin={isAdmin} />
    </section>
  )
}
