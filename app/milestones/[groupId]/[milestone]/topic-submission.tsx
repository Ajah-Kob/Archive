import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getTopicSubmissionData } from '@/lib/actions/topic'
import { getGroupContext } from '@/lib/actions/groups'
import { CapstoneJourney } from '@/components/milestones/CapstoneJourney'
import { GroupContext } from '@/components/milestones/GroupContext'
import { TopicSubmissionView } from '@/components/milestones/topic-submission/TopicSubmissionView'
import { LockedGroupPlaceholder } from '@/components/milestones/topic-submission/LockedGroupPlaceholder'

export const metadata: Metadata = {
  title: 'Topic Submission',
  description: 'Submit and track your capstone topics',
}

export default async function TopicSubmissionWorkspace({
  groupId,
}: {
  groupId: number
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const group = await getGroupContext(groupId)
  const groupPayload = group.success && group.payload ? group.payload : null
  if (!groupPayload) notFound()

  const res = await getTopicSubmissionData(+session.user.id)
  const data = res.success && res.payload ? res.payload : null
  if (data && data.group && data.group.id !== groupId) notFound()

  return (
    <section className="h-full flex min-h-0">
      <CapstoneJourney
        journey={data?.journey ?? []}
        activeSlug="topic-submission"
        groupId={groupId}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <GroupContext group={groupPayload} />
        <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
          {data?.group ? (
            <TopicSubmissionView data={data} />
          ) : (
            <LockedGroupPlaceholder />
          )}
        </div>
      </div>
    </section>
  )
}
