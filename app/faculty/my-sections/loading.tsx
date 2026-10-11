import { PageLabel } from '@/components/globals/PageLabel'
import { HeaderBar } from '@/components/globals/HeaderBar'

/**
 * Streaming fallback for /faculty/my-sections.
 *
 * Mirrors MySectionsPage: the same bar (search + phase filter) and the same
 * SectionCard grid (tinted header with title + code, avatar/count body,
 * phase + menu footer). Empty fixed-width blocks only — no text.
 */
function SectionCardSkeleton() {
  return (
    <div className="bg-white flex flex-col items-start overflow-clip rounded-[8px] border border-[#eceef8] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full">
      {/* Header — tinted like the real palette-driven header. */}
      <div className="bg-[#eef2ff] border-[#e4e7f8] border-b border-solid flex flex-col items-start pb-[15px] pt-[20px] px-[20px] w-full">
        <div className="h-[20px] w-32 rounded bg-slate-200" />
        <div className="h-[18px] w-24 rounded bg-[#e8ebf8] mt-[4px]" />
      </div>

      {/* Body — avatar stack + counts. */}
      <div className="flex flex-col items-start w-full">
        <div className="flex flex-col gap-[10px] p-[16px] w-full min-h-[88px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="size-[28px] rounded-full bg-[#e8ebf8] border-2 border-white shrink-0" />
              ))}
            </div>
            <div className="h-[12px] w-28 rounded bg-[#e8ebf8] ml-1" />
          </div>
        </div>

        {/* Footer — phase + action menu. */}
        <div className="flex items-center justify-between pb-[8px] px-[12px] w-full">
          <div className="h-[11px] w-20 rounded bg-[#e8ebf8]" />
          <div className="flex gap-[3px]">
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MySectionsLoading() {
  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="My Sections" />
      <div aria-hidden="true" className="flex flex-col flex-1 min-h-0 animate-pulse">
        <HeaderBar>
          <div className="w-[200px] sm:w-[280px] shrink-0 py-[8px]">
            <div className="w-full h-[37.5px] rounded-lg bg-[#dfe3fb]" />
          </div>
          <div className="h-[37.5px] w-[140px] shrink-0 rounded-lg bg-[#dfe3fb]" />
        </HeaderBar>

        <div className="flex-1 min-h-0 pt-[16px] px-4 sm:px-8 pb-[30px] flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SectionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
