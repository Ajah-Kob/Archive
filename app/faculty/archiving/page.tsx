import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getArchivingSubmissionsForReview } from '@/lib/actions/archiving'
import { PageLabel } from '@/components/globals/PageLabel'
import { ArchivingReviewPage } from '@/components/archiving/ArchivingReviewPage'
import { roleHome } from '@/lib/helper'

export default async function ArchivingReviewRoute() {
  const session = await getServerSession(authOptions)

  // Server-side guard (defense in depth — proxy is the single authority, but
  // server actions also DB-check; we mirror the proxy's token check here to
  // avoid rendering the page shell for non-program-chairs before redirect).
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
      <PageLabel label="Archiving Review" />

      <div className="flex-1 flex flex-col min-h-0 px-8 py-6">
        <div className="mb-4 shrink-0">
          <h1 className="font-heading font-bold text-[18px] leading-[27px] text-[#10133a] tracking-[-0.18px]">
            Archiving Review
          </h1>
          <p className="font-sans text-[13px] leading-[19.5px] text-[#8a93b4] mt-1">
            Review submitted capstones and approve them for publication to the Repository. DRAFT submissions are hidden — only IN_REVIEW and
            ARCHIVED are listed.
          </p>
        </div>

        <ArchivingReviewPage submissions={submissions} />
      </div>
    </section>
  )
}
