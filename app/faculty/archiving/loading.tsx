import { ChairReviewSkeleton } from '@/components/milestones/archiving/ArchivingSkeletons'
import { PageLabel } from '@/components/globals/PageLabel'

export default function ArchivingReviewLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Archiving Review" />
      {/* HeaderBar skeleton — matches SearchBar 320px + Filter */}
      <div className="flex flex-wrap items-center gap-2.5 px-8 bg-[#eef2ff] border-b border-[#dfe3fb] h-[56px] shrink-0 animate-pulse">
        <div className="h-[37.5px] w-[320px] max-w-[320px] min-w-[180px] rounded-lg bg-[#dfe3fb]" />
        <div className="h-[37.5px] w-[140px] rounded-lg bg-[#dfe3fb]" />
      </div>
      <div className="flex-1 flex flex-col min-h-0 px-8 py-6">
        <ChairReviewSkeleton />
      </div>
    </section>
  )
}
