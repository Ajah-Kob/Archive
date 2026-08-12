import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { ComingSoon } from '@/components/workspace/ComingSoon'
import { getGroupContext, getMyWorkspace } from '@/lib/actions/groups'
import { GroupContext } from '@/components/milestones/GroupContext'
import { CapstoneJourney } from '@/components/milestones/CapstoneJourney'
import { JOURNEY_ROWS, WORKSPACE_SLUGS } from '@/types/milestones'
import TopicSubmissionWorkspace from './topic-submission'

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; milestone: string }>
}) {
  const { groupId, milestone } = await params

  const group = await getGroupContext(parseInt(groupId))
  const groupPayload = group.success && group.payload ? group.payload : null
  if (!groupPayload) notFound()

  if (!WORKSPACE_SLUGS.includes(milestone)) notFound()

  if (milestone === 'topic-submission') {
    return <TopicSubmissionWorkspace groupId={groupPayload.id} />
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const res = await getMyWorkspace(+session.user.id)
  const workspace = res.success && res.payload ? res.payload : null
  if (!workspace?.group || workspace.group.id !== groupPayload.id) notFound()

  const row = JOURNEY_ROWS.find((r) => r.slug === milestone)

  return (
    <section className="h-full flex min-h-0">
      <CapstoneJourney
        journey={workspace.journey}
        activeSlug={milestone}
        groupId={groupPayload.id}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <GroupContext group={groupPayload} />

        <div className="flex-1 min-h-0 p-8 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-[22px] leading-[33px] text-[#10133a] tracking-[-0.135px]">
              {row?.label ?? 'Workspace'}
            </h2>
            <Link
              href={`/milestones/${groupPayload.id}`}
              className="flex gap-[7px] items-center h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
            >
              <ArrowLeft className="size-3.5" />
              Back to Milestones
            </Link>
          </div>
          <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] -mt-1">
            {row?.header} workspace
          </p>

          <ComingSoon
            title={`${row?.label ?? 'This workspace'} is coming soon`}
            description={`The ${row?.header} workspace for ${row?.label.toLowerCase() ?? 'this step'} is not available yet. Track the current status of each step from the Milestones page.`}
          />
        </div>
      </div>
    </section>
  )
}

