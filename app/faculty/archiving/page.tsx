import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getArchivingSubmissionsForReview } from '@/lib/actions/archiving'
import { PageLabel } from '@/components/globals/PageLabel'
import { ArchivingReviewPage } from '@/components/archiving/ArchivingReviewPage'
import { roleHome } from '@/lib/helper'

export default async function ArchivingReviewRoute() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  const role = (session.user as unknown as { role?: string }).role
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'
  const isProgramChair = (session.user as unknown as { isProgramChair?: boolean }).isProgramChair === true
  if (!isAdmin && !isProgramChair) {
    redirect(roleHome(role))
  }

  const res = await getArchivingSubmissionsForReview()
  const submissions = res.success && res.payload ? res.payload : []

  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Archiving" />
      <ArchivingReviewPage submissions={submissions} />
    </section>
  )
}
