import Link from 'next/link'
import { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { ComingSoon } from '@/components/workspace/ComingSoon'
import { getMyWorkspace } from '@/lib/actions/groups'
import { getChapterData } from '@/lib/actions/chapter'
import { getTopicSelectionData, getTopicSubmissionData } from '@/lib/actions/topic'
import { getMyArchivingStatus } from '@/lib/actions/archiving'
import { GroupContext } from '@/components/milestones/GroupContext'
import { CapstoneJourney } from '@/components/milestones/CapstoneJourney'
import { JOURNEY_ROWS, SLUG_TO_CHAPTER, WORKSPACE_SLUGS } from '@/types/milestones'
import { LockedGroupPlaceholder } from '@/components/milestones/topic-submission/LockedGroupPlaceholder'
import { TopicSelectionView } from '@/components/milestones/topic-selection/TopicSelectionView'
import { TopicSubmissionView } from '@/components/milestones/topic-submission/TopicSubmissionView'
import { ChapterSubmissionView } from '@/components/milestones/chapter/ChapterSubmissionView'
import { LockedChapterPlaceholder } from '@/components/milestones/chapter/LockedChapterPlaceholder'
import { ArchivingView } from '@/components/milestones/archiving/ArchivingView'

const DEFENSE_SLUGS = ['proposal-defense', 'final-defense']

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

  if ((DEFENSE_SLUGS as readonly string[]).includes(milestone)) {
    redirect(`/student/milestone/${milestone}/defense`)
  }

  const userId = +session.user.id
  const chapter = SLUG_TO_CHAPTER[milestone]
  const [workspaceRes, topicRes, chapterRes, archivingRes] = await Promise.all([
    getMyWorkspace(userId),
    milestone === 'topic-submission'
      ? getTopicSubmissionData(userId)
      : milestone === 'topic-selection'
        ? getTopicSelectionData(userId)
        : Promise.resolve(null),
    chapter ? getChapterData(chapter) : Promise.resolve(null),
    milestone === 'archiving' ? getMyArchivingStatus() : Promise.resolve(null),
  ])

  const workspace = workspaceRes.success && workspaceRes.payload ? workspaceRes.payload : null

  if (milestone === 'archiving') {
    if (!workspace) notFound()
    const isLocked = workspace.journey.find((r) => r.slug === 'archiving')?.state === 'LOCKED'
    if (isLocked) redirect('/student/milestone')
    const raw =
      archivingRes &&
      (archivingRes as { success: boolean; payload: { status: string } | null }).success
        ? (archivingRes as unknown as { success: boolean; payload: { status: 'READY_FOR_ARCHIVING' | 'IN_REVIEW' | 'CAPSTONE_ARCHIVED'; title: string | null; abstract: string | null; tags: string[]; authorOrder: unknown[]; blobUrl: string | null; fileName: string | null; mimeType: string | null; size: number | null; groupId: number | null; updatedAt: string | null } | null }).payload
        : null

    const status = (raw?.status as 'READY_FOR_ARCHIVING' | 'IN_REVIEW' | 'CAPSTONE_ARCHIVED') ?? 'READY_FOR_ARCHIVING'

    const initialData = raw
      ? {
          status,
          dbStatus: (raw as unknown as { dbStatus: string | null }).dbStatus ?? null,
          title: raw.title ?? null,
          abstract: raw.abstract ?? null,
          tags: raw.tags ?? [],
          authorOrder: (raw.authorOrder as unknown[]) ?? [],
          blobUrl: raw.blobUrl ?? null,
          fileName: raw.fileName ?? null,
          mimeType: raw.mimeType ?? null,
          size: raw.size ?? null,
          groupId: raw.groupId ?? null,
          submission: (raw as unknown as { submission: unknown }).submission ?? null,
          archive: (raw as unknown as { archive: unknown }).archive ?? null,
          updatedAt: raw.updatedAt ?? null,
        }
      : {
          status: 'READY_FOR_ARCHIVING' as const,
          dbStatus: null,
          title: null,
          abstract: null,
          tags: [] as string[],
          authorOrder: [] as unknown[],
          blobUrl: null,
          fileName: null,
          mimeType: null,
          size: null,
          groupId: workspace.group?.id ?? null,
          submission: null,
          archive: null,
          updatedAt: null,
        }

    return (
      <section className="h-full flex min-h-0">
        <CapstoneJourney journey={workspace.journey} activeSlug="archiving" phaseLocks={(workspace as any).phaseLocks} />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <GroupContext />
          <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col overflow-hidden">
            {isLocked ? (
              <LockedChapterPlaceholder chapterLabel="Archiving" />
            ) : (
              <ArchivingView
                initialStatus={status}
                initialData={initialData as unknown as import('@/lib/actions/archiving').ArchivingPayload}
              />
            )}
          </div>
        </div>
      </section>
    )
  }

  if (!workspace?.group) notFound()

  if (milestone === 'topic-submission') {
    const data = topicRes?.success && topicRes.payload ? topicRes.payload : null
    if (!data?.group) notFound()
    const isLocked = (data as any).journey?.find((r: any) => r.slug === 'topic-submission')?.state === 'LOCKED'
    if (isLocked) redirect('/student/milestone')

    return (
      <section className="h-full flex min-h-0">
        <CapstoneJourney journey={data.journey} activeSlug="topic-submission" phaseLocks={(data as any).phaseLocks} />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <GroupContext />
          <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
            {isLocked ? (
              <LockedChapterPlaceholder chapterLabel="Topic Submission" />
            ) : data.group ? (
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
    const isLocked = (data as any).journey?.find((r: any) => r.slug === 'topic-selection')?.state === 'LOCKED'
    if (isLocked) redirect('/student/milestone')

    return (
      <section className="h-full flex min-h-0">
        <CapstoneJourney journey={data.journey} activeSlug="topic-selection" phaseLocks={(data as any).phaseLocks} />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <GroupContext />
          <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
            {isLocked ? (
              <LockedChapterPlaceholder chapterLabel="Topic Selection" />
            ) : data.group ? (
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
    if (!data.open) redirect('/student/milestone')

    return (
      <section className="h-full flex min-h-0">
        <CapstoneJourney journey={data.journey} activeSlug={milestone} phaseLocks={(data as any).phaseLocks} />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <GroupContext />

          <div className="flex-1 min-h-0 px-8 py-[30px] flex flex-col">
            <ChapterSubmissionView payload={data} />
          </div>
        </div>
      </section>
    )
  }

  const row = JOURNEY_ROWS.find((r) => r.slug === milestone)
  const isGenericLocked = workspace.journey.find((r) => r.slug === milestone)?.state === 'LOCKED'
  if (isGenericLocked) redirect('/student/milestone')

  return (
    <section className="h-full flex min-h-0">
      <CapstoneJourney journey={workspace.journey} activeSlug={milestone} phaseLocks={(workspace as any).phaseLocks} />

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <GroupContext />

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
          <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] -mt-1">{row?.header} workspace</p>

          <ComingSoon
            title={`${row?.label ?? 'This workspace'} is coming soon`}
            description={`The ${row?.header} workspace for ${row?.label?.toLowerCase() ?? 'this step'} is not available yet. Track the current status of each step from the Milestones page.`}
          />
        </div>
      </div>
    </section>
  )
}
