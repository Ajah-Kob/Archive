/**
 * Loading placeholder for /repository.
 *
 * Mirrors RepositoryClient's real layout one-to-one so the swap to loaded
 * content does not shift anything:
 *   - HeaderBar strip (px-8, bg-[#eef2ff], border-b) with search /
 *     published-date-range placeholders and the admin-only
 *     Upload Research slot
 *   - results-count row
 *   - sort + Favorites row above the list (both moved out of the bar)
 *   - the dotted content background with archive cards
 *
 * Each card reproduces the real card's anatomy: 5px left color bar, title,
 * "Published …" meta line, clamped abstract, tag chips, and the three footer
 * buttons. Card count is fixed because loading.tsx is a server component with
 * no data — a count that varied would reintroduce the dependency the cache
 * boundary exists to avoid.
 */

import { ScrollFadeRegion } from '@/components/ui/ScrollFadeRegion'

const CARD_COUNT = 5

// Matches the pulse colour used across the existing skeletons.
const BLOCK = 'bg-[#e8ebf8]'

/** One archive card, structurally identical to the real card's boxes. */
function ArchiveCardSkeleton() {
  return (
    <div className="bg-white rounded-[12px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)] flex overflow-hidden w-full">
      {/* 5px accent bar, self-stretch so it matches the card's full height */}
      <div className="w-[5px] bg-[#e8ebf8] shrink-0 self-stretch" aria-hidden="true" />
      <div className="flex-1 min-w-0 p-[20px] flex flex-col gap-[12px]">
        <div className="flex items-start justify-between gap-2">
          {/* line-clamp-3 on the real title -> three lines is the tallest case */}
          <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
            <div className={`h-[15px] w-[85%] rounded ${BLOCK}`} />
            <div className={`h-[15px] w-[60%] rounded ${BLOCK}`} />
          </div>
          {/* admin-only ActionMenu slot */}
          <div className="size-[18px] rounded-md bg-[#eef0f8] shrink-0" aria-hidden="true" />
        </div>

        {/* "Published <date> · <authors>" */}
        <div className={`h-[12px] w-[45%] rounded ${BLOCK}`} />

        {/* line-clamp-4 abstract */}
        <div className="flex flex-col gap-[7px]">
          <div className={`h-[12px] w-full rounded ${BLOCK}`} />
          <div className={`h-[12px] w-[92%] rounded ${BLOCK}`} />
        </div>

        {/* tag chips — h-[23px] rounded-full, matching the real pill height */}
        <div className="flex flex-wrap gap-[5px] w-full">
          <div className="h-[23px] w-[74px] rounded-full bg-[#f4f6ff] border border-[#e9ecf9]" />
          <div className="h-[23px] w-[58px] rounded-full bg-[#f4f6ff] border border-[#e9ecf9]" />
          <div className="h-[23px] w-[66px] rounded-full bg-[#f4f6ff] border border-[#e9ecf9]" />
        </div>

        {/* footer buttons: Favorite / Details / Open, all h-[32px] */}
        <div className="border-t border-[#f0f2fa] pt-[12px] mt-[4px] flex flex-wrap justify-end gap-[10px]">
          <div className="h-[32px] w-[104px] rounded-[9px] bg-white border border-[#e4e7f6]" />
          <div className="h-[32px] w-[98px] rounded-[9px] bg-white border border-[#e4e7f6]" />
          <div className="h-[32px] w-[88px] rounded-[9px] bg-white border border-[#e4e7f6]" />
        </div>
      </div>
    </div>
  )
}

export function RepositorySkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 animate-pulse motion-reduce:animate-none">
      {/* HeaderBar strip — real: px-8 bg-[#eef2ff] border-b min-h-[56px] */}
      <div className="flex flex-nowrap h-fit items-center justify-between gap-x-[16px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
        {/* Single line, matching the real bar: the search and date range scroll
            together instead of wrapping. */}
        <ScrollFadeRegion className="flex items-center gap-1 flex-1">
          {/* SearchBar is w-[280px] sm:flex-[0_0_320px] in the real header */}
          <div className="w-[280px] sm:flex-[0_0_320px] sm:max-w-[320px] h-[37.5px] shrink-0 rounded-lg bg-[#dfe3fb]" />
          {/* published-date range pair — w-[280px] sm:w-[300px] grid-cols-2 in the real header */}
          <div className="w-[280px] sm:w-[300px] shrink-0 grid grid-cols-2 gap-[12px]">
            <div className="h-[40px] rounded-md bg-white border border-[#e4e7f6]" />
            <div className="h-[40px] rounded-md bg-white border border-[#e4e7f6]" />
          </div>
        </ScrollFadeRegion>
        {/* admin-only Upload Research slot — reserved so the bar does not reflow */}
        <div className="flex items-center gap-[8px] shrink-0">
          <div className="h-[37.5px] w-[145px] rounded-lg bg-[#c9cffb]" />
        </div>
      </div>

      {/* dotted content background, identical to the real page */}
      <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-8 bg-[#f8f9fe] bg-[radial-gradient(circle,#dbe0f3_1px,transparent_1px)] bg-[size:22px_22px] gap-4 overflow-y-auto">
        {/* One row above the list: Sort, results count, then Favorites hard right.
            Widths are estimates from the real control metrics rather than
            measured — if the row resizes on swap-in, adjust these and nothing
            else. */}
        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[8px] shrink-0">
          <div className="flex items-center gap-[10px] min-w-0 shrink-0">
            <div className={`h-[12px] w-[26px] rounded ${BLOCK}`} />
            <div className="h-[37.5px] w-[93px] shrink-0 rounded-lg bg-white border border-[#e4e7f6]" />
          </div>

          <div className={`h-[11px] w-[64px] rounded ${BLOCK}`} />

          <div className="ml-auto h-[37.5px] w-[126px] shrink-0 rounded-lg bg-white border border-[#e4e7f6]" />
        </div>

        <div className="flex flex-col gap-4">
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
            <ArchiveCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default RepositorySkeleton
