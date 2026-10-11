import { PageLabel } from '@/components/globals/PageLabel'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { ScrollFadeRegion } from '@/components/ui/ScrollFadeRegion'
import { FacultyTableSkeleton } from '@/components/faculty/FacultyTableSkeleton'

/**
 * Streaming fallback for the advisers tab.
 *
 * Mirrors the page one-for-one: FacultiesTabs (Advisers active), the
 * FacultyList search strip (search only — advisers carry no join-code
 * control), and the white panel carrying FacultyTableSkeleton. Empty
 * fixed-width blocks only — no text.
 */
export default function AdviserListLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Advisers" />
      <div aria-hidden="true" className="flex flex-col flex-1 min-h-0 animate-pulse">
        <HeaderBar>
          <div className="flex items-center h-[40px] px-[14px] shrink-0">
            <div className="h-[13px] w-[68px] rounded bg-[#e8ebf8]" />
          </div>
          <div className="relative flex items-center h-[40px] px-[14px] shrink-0">
            <div className="h-[13px] w-[60px] rounded bg-slate-200" />
            <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-slate-300" />
          </div>
          <div className="flex items-center h-[40px] px-[14px] shrink-0">
            <div className="h-[13px] w-[88px] rounded bg-[#e8ebf8]" />
          </div>
        </HeaderBar>

        <div className="w-full flex flex-nowrap items-center gap-x-[16px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
          <ScrollFadeRegion className="flex items-center gap-2.5 flex-1">
            <div className="h-[37.5px] w-[280px] sm:w-[320px] shrink-0 rounded-lg bg-[#dfe3fb]" />
          </ScrollFadeRegion>
        </div>

        <div className="flex-1 min-h-0 pt-[16px] px-4 pb-[30px] sm:px-8 flex flex-col">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            <FacultyTableSkeleton />
          </div>
        </div>
      </div>
    </section>
  )
}
