import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getGroupContext, getMyWorkspace } from '@/lib/actions/groups'
import { CapstoneJourney } from '@/components/milestones/CapstoneJourney'
import { GroupContext } from '@/components/milestones/GroupContext'
import { MilestonesView } from '@/components/milestones/MilestonesView'

export const metadata: Metadata = {
  title: 'Milestones',
  description: 'Submit and track your capstone chapter progress',
}

export default async function MilestonePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const res = await getMyWorkspace(+session.user.id)
  const workspace = res.success && res.payload ? res.payload : null
  if (!workspace) notFound()

  const groupContext = workspace.group
    ? await getGroupContext(workspace.group.id)
    : null
  const groupPayload =
    groupContext?.success && groupContext.payload ? groupContext.payload : null

  return (
    <section className="h-full flex min-h-0">
      <CapstoneJourney journey={workspace.journey} />

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {groupPayload && <GroupContext group={groupPayload} />}

        <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
          <MilestonesView data={workspace} />
        </div>
      </div>
    </section>
  )
}
