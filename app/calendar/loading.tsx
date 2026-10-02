import { CalendarSkeleton } from '@/components/calendar/CalendarClient'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Streaming fallback for /calendar.
 *
 * The page is dynamic — getCalendarFeed() reads the session — so on first
 * navigation there was no route-level loading UI at all and the browser showed
 * the unpainted <body>, which has no background, hence the white flash.
 *
 * Mirrors CalendarClient's outer structure one-for-one: the same single-line
 * HeaderBar, then the same #f8f9fe dotted ground and white card, then the
 * shared body skeleton. The background is the important part -- it means the
 * moment before this renders reads as the calendar page rather than as a blank
 * document.
 */
export default function CalendarLoading() {
  const BAR = 'bg-[#e9ecf9]'
  const control =
    'flex items-center justify-center size-[37.5px] bg-white border border-[#e8ebf8] rounded-lg shrink-0'

  return (
    <>
      <HeaderBar>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={control}>
              <ChevronLeft className="size-4" strokeWidth={2} />
            </span>
            <span className={control}>
              <ChevronRight className="size-4" strokeWidth={2} />
            </span>
          </div>
          <span
            className={`flex items-center justify-center h-[37.5px] px-[14px] rounded-lg font-sans font-semibold text-[13px] shrink-0 ${BAR}`}
          >
            Today
          </span>
        </div>

        {/* View switcher — four equal tabs, matching CalendarViewSwitcher. */}
        <div className="flex items-center h-[37.5px] px-[5px] py-[6px] bg-white border border-[#e8ebf8] rounded-lg gap-[2px] shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-[24px] w-[38px] rounded-[6px] ${BAR}`}
            />
          ))}
        </div>
      </HeaderBar>

      <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-8 bg-[#f8f9fe] bg-[radial-gradient(circle,#dbe0f3_1px,transparent_1px)] bg-[size:22px_22px] gap-4 overflow-y-auto">
        <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.04)] p-4 sm:p-6 w-full">
          {/* Period title, e.g. the month and year. */}
          <div className="flex items-center justify-center pb-1">
            <span className={`h-[14px] w-[120px] rounded ${BAR}`} />
          </div>

          <CalendarSkeleton />
        </div>
      </div>
    </>
  )
}
