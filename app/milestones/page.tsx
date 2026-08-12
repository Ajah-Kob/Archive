import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getMyWorkspace } from '@/lib/actions/groups'
import { CapstoneJourney } from '@/components/milestones/CapstoneJourney'
import { MilestonesView } from '@/components/milestones/MilestonesView'

export const metadata: Metadata = {
  title: 'Milestones',
  description: 'Submit and track your capstone chapter progress',
}

export default async function MilestonesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const res = await getMyWorkspace(+session.user.id)
  const workspace = res.success && res.payload ? res.payload : null

  if (workspace?.group) {
    redirect(`/milestones/${workspace.group.id}`)
  }

  return (
    <div className="h-full flex min-h-0">
      <CapstoneJourney journey={workspace?.journey ?? []} />

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-8 pt-8 pb-5 flex flex-col gap-3 shrink-0">
          <div className="flex flex-col gap-[5px]">
            <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
              Milestones
            </h1>
            <p className="font-sans font-medium text-[13.5px] text-[#8a93b4]">
              Submit and track your capstone chapter progress
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-8 pb-[30px]">
          {workspace && <MilestonesView data={workspace} />}
        </div>
      </div>
    </div>
  )
}