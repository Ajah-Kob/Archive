import { getChapterData } from '@/lib/actions/chapter'
import { ChapterSubmissionView, LockedChapterPlaceholder } from '@/components/milestones/chapter/ChapterSubmissionView'
import { SLUG_TO_CHAPTER } from '@/types/milestones'
import { notFound } from 'next/navigation'

export default async function MilestonePage({ params }: { params: Promise<{ milestone: string }> }) {
  const { milestone } = await params
  const chapter = SLUG_TO_CHAPTER[milestone]
  if (!chapter) notFound()

  const { success, payload } = await getChapterData(chapter)
  if (!success || !payload) return <LockedChapterPlaceholder label={milestone} />

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 font-sora text-[20px] font-bold text-[#1e3a8a]">{payload.chapter.label}</h1>
      {payload.open ? (
        <ChapterSubmissionView payload={payload} />
      ) : (
        <LockedChapterPlaceholder label={payload.chapter.label} />
      )}
    </div>
  )
}
