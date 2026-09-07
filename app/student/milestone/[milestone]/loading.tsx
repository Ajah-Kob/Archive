import { ArchivingSkeleton } from '@/components/milestones/archiving/ArchivingSkeletons'

export default function MilestoneLoading() {
  return (
    <section className="h-full flex min-h-0">
      <div className="hidden lg:flex w-[200px] shrink-0 bg-white shadow-[0px_2px_12px_rgba(30,58,138,0.06)] flex-col gap-[12px] px-[13px] py-[26px] animate-pulse">
        <div className="h-[13px] w-[120px] rounded bg-[#e8ebf8]" />
        <div className="flex flex-col gap-[16px] flex-1">
          <div className="h-[10px] w-[70px] rounded bg-[#e8ebf8]" />
          <div className="h-[50px] w-full rounded-[9px] bg-[#e8ebf8]" />
          <div className="h-[50px] w-full rounded-[9px] bg-[#e8ebf8]" />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 px-4 sm:px-8 py-[30px] flex flex-col overflow-hidden">
          <ArchivingSkeleton />
        </div>
      </div>
    </section>
  )
}
