import { PageLabel } from '@/components/globals/PageLabel'
import { HeaderBar } from '@/components/globals/HeaderBar'

/**
 * Streaming fallback for /faculty/defense.
 *
 * Mirrors DefensePage: the same three-tab HeaderBar (Upcoming active) and the
 * same DefenseCard grid (tinted header with group + badge, body with avatar
 * stack, role, date/venue/verdict rows). Empty fixed-width blocks only.
 */
function DefenseCardSkeleton() {
  return (
    <div className="bg-white flex flex-col items-start overflow-clip rounded-[8px] border border-[#eceef8] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full">
      {/* Header — tinted like the real type-colored header. */}
      <div className="bg-[#eef2ff] border-[#e4e7f8] border-b border-solid flex flex-col px-[20px] pt-[16px] pb-[14px] w-full">
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex flex-col gap-[6px] min-w-0">
            <div className="h-[18px] w-32 rounded bg-slate-200" />
            <div className="h-[12px] w-24 rounded bg-[#e8ebf8]" />
          </div>
          <div className="h-[26px] w-[110px] rounded-[8px] bg-white border border-[#e4e7f8] shrink-0" />
        </div>
      </div>

      {/* Body — avatar stack, role, date/venue/verdict rows. */}
      <div className="flex flex-col gap-[10px] p-[16px] w-full">
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="size-[28px] rounded-full bg-[#e8ebf8] border-2 border-white shrink-0" />
            ))}
          </div>
          <div className="h-[12px] w-20 rounded bg-[#e8ebf8] ml-1" />
        </div>
        <div className="h-[12px] w-24 rounded bg-[#e8ebf8]" />
        {['w-40', 'w-32', 'w-24'].map((w) => (
          <div key={w} className="flex items-center gap-[5px]">
            <div className="size-[11px] rounded bg-slate-200 shrink-0" />
            <div className={`h-[12px] ${w} rounded bg-[#e8ebf8]`} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FacultyDefenseLoading() {
  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="Defense" />
      <div aria-hidden="true" className="flex flex-col flex-1 min-h-0 animate-pulse">
        <HeaderBar>
          <div className="relative flex items-center h-[40px] px-[14px] shrink-0">
            <div className="h-[13px] w-[68px] rounded bg-slate-200" />
            <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-slate-300" />
          </div>
          <div className="flex items-center h-[40px] px-[14px] shrink-0">
            <div className="h-[13px] w-[104px] rounded bg-[#e8ebf8]" />
          </div>
          <div className="flex items-center h-[40px] px-[14px] shrink-0">
            <div className="h-[13px] w-[76px] rounded bg-[#e8ebf8]" />
          </div>
        </HeaderBar>

        <div className="flex-1 min-h-0 pt-[16px] px-4 sm:px-8 pb-[30px] flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <DefenseCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
