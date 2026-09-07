import { ChairReviewSkeleton } from '@/components/milestones/archiving/ArchivingSkeletons'
import { PageLabel } from '@/components/globals/PageLabel'

export default function ArchivingReviewLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Archiving Review" />
      <div className="flex-1 flex flex-col min-h-0 px-8 py-6">
        <div className="mb-4 shrink-0 animate-pulse">
          <div className="h-[18px] w-[160px] rounded bg-[#e8ebf8]" />
          <div className="h-[13px] w-[420px] max-w-full rounded bg-[#e8ebf8]/60 mt-2" />
        </div>
        <ChairReviewSkeleton />
      </div>
    </section>
  )
}
