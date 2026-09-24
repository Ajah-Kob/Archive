import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { PageLabel } from '@/components/globals/PageLabel'
import { getMyWorkspace } from '@/lib/actions/groups'
import { MilestonesView } from '@/components/milestones/MilestonesView'

export const metadata: Metadata = {
  title: 'My Team',
  description: 'View your capstone team, topic, and adviser',
}

export default async function MyTeamPage() {
  const session = await getServerSession(authOptions)

  const res = await getMyWorkspace(+session.user.id)
  const workspace = res.success && res.payload ? res.payload : null
  if (!workspace) notFound()

  return (
    <section className="h-full flex min-h-0">
      <PageLabel label="My Team" />
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
          <MilestonesView data={workspace} />
        </div>
      </div>
    </section>
  )
}
