import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { ComingSoon } from '@/components/workspace/ComingSoon'
import { getGroupContext, getMyWorkspace } from '@/lib/actions/groups'
import { getChapterData } from '@/lib/actions/chapter'
import { getTopicSelectionData, getTopicSubmissionData } from '@/lib/actions/topic'
import { GroupContext } from '@/components/milestones/GroupContext'
import { CapstoneJourney } from '@/components/milestones/CapstoneJourney'
import { JOURNEY_ROWS, SLUG_TO_CHAPTER, WORKSPACE_SLUGS } from '@/types/milestones'
import { LockedGroupPlaceholder } from '@/components/milestones/topic-submission/LockedGroupPlaceholder'
import { TopicSelectionView } from '@/components/milestones/topic-selection/TopicSelectionView'
import { TopicSubmissionView } from '@/components/milestones/topic-submission/TopicSubmissionView'
import { ChapterSubmissionView, LockedChapterPlaceholder } from '@/components/milestones/chapter/ChapterSubmissionView'

export const metadata: Metadata = {
  title: 'Milestones',
  description: 'Submit and track your capstone chapter progress',
}

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ milestone: string }>
}) {
  const session = await getServerSession(authOptions)

  const { milestone } = await params
  if (!WORKSPACE_SLUGS.includes(milestone)) notFound()

  const userId = +session.user.id
  const chapter = SLUG_TO_CHAPTER[milestone]
  const [workspaceRes, topicRes, chapterRes] = await Promise.all([
    getMyWorkspace(userId),
    milestone === 'topic-submission'
      ? getTopicSubmissionData(userId)
      : milestone === 'topic-selection'
        ? getTopicSelectionData(userId)
        : Promise.resolve(null),
    chapter ? getChapterData(chapter) : Promise.resolve(null),
  ])

  const workspace = workspaceRes.success && workspaceRes.payload ? workspaceRes.payload : null
  if (!workspace?.group) notFound()

  const group = await getGroupContext(workspace.group.id)
  const groupPayload = group.success && group.payload ? group.payload : null
  if (!groupPayload) notFound()

  if (milestone === 'topic-submission') {
    const data = topicRes?.success && topicRes.payload ? topicRes.payload : null
    if (!data?.group) notFound()

    return (
      <section className="h-full flex min-h-0">
        <CapstoneJourney journey={data.journey} activeSlug="topic-submission" />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <GroupContext group={groupPayload} />
          <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
            {data.group ? (
              <TopicSubmissionView data={data} />
            ) : (
              <LockedGroupPlaceholder />
            )}
          </div>
        </div>
      </section>
    )
  }

  if (milestone === 'topic-selection') {
    const data = topicRes?.success && topicRes.payload ? topicRes.payload : null
    if (!data?.group) notFound()

    return (
      <section className="h-full flex min-h-0">
        <CapstoneJourney journey={data.journey} activeSlug="topic-selection" />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <GroupContext group={groupPayload} />
          <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
            {data.group ? (
              <TopicSelectionView data={data} />
            ) : (
              <LockedGroupPlaceholder />
            )}
          </div>
        </div>
      </section>
    )
  }

  if (chapter) {
    const data = chapterRes?.success && chapterRes.payload ? chapterRes.payload : null
    if (!data) notFound()

    return (
      <section className="h-full flex min-h-0">
        <CapstoneJourney journey={data.journey} activeSlug={milestone} />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <GroupContext group={groupPayload} />

          <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
            {data.open ? (
              <ChapterSubmissionView payload={data} />
            ) : (
              <LockedChapterPlaceholder label={data.chapter.label} />
            )}
          </div>
        </div>
      </section>
    )
  }

  const row = JOURNEY_ROWS.find((r) => r.slug === milestone)

  return (
    <section className="h-full flex min-h-0">
      <CapstoneJourney journey={workspace.journey} activeSlug={milestone} />

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <GroupContext group={groupPayload} />

        <div className="flex-1 min-h-0 p-8 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-[22px] leading-[33px] text-[#10133a] tracking-[-0.135px]">
              {row?.label ?? 'Workspace'}
            </h2>
            <Link
              href="/student/milestone"
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
            description={`The ${row?.header} workspace for ${row?.label?.toLowerCase() ?? 'this step'} is not available yet. Track the current status of each step from the Milestones page.`}
          />
        </div>
      </div>
    </section>
  )
}
