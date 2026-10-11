import { PageLabel } from '@/components/globals/PageLabel'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SectionTableSkeleton } from '@/components/sections/main/SectionTableSkeleton'

/**
 * Streaming fallback for /faculty/section-management.
 *
 * Mirrors SectionsOverview's loading branch: the same bar (search + phase
 * filter, Create Section action) and the same mobile ordering stand-in above
 * SectionTableSkeleton, which owns its own white panel.
 */
export default function SectionManagementLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Section Management" />
      <div aria-hidden="true" className="flex flex-col flex-1 min-h-0 animate-pulse">
        <HeaderBar
          actions={
            <div className="h-[32px] w-[140px] rounded-[8px] bg-[#dfe3fb]" />
          }
        >
          <div className="flex flex-nowrap items-center gap-2.5 w-max">
            <div className="h-[37.5px] w-[280px] sm:w-[320px] shrink-0 rounded-lg bg-[#dfe3fb]" />
            <div className="h-[37.5px] w-[140px] shrink-0 rounded-lg bg-[#dfe3fb]" />
          </div>
        </HeaderBar>
        <div className="flex-1 flex flex-col min-h-0 pt-[16px] px-4 sm:px-8 pb-[30px]">
          {/* Stand-in for the mobile ordering select. */}
          <div className="sm:hidden flex items-center mb-[12px] shrink-0">
            <div className="h-[37.5px] w-[93px] rounded-lg bg-white border border-[#e4e7f6]" />
          </div>
          <SectionTableSkeleton rows={5} />
        </div>
      </div>
    </section>
  )
}
