import { CalendarSkeleton } from '@/components/calendar/CalendarClient'
import { HeaderBar } from '@/components/globals/HeaderBar'

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
 *
 * The bar keeps its real chrome — same white surfaces, same borders, same
 * sizes — and only the *content* is greyed. Painting the real chevron icons here
 * made dead controls look live, which is worse than showing nothing.
 */
export default function CalendarLoading() {
  const BLOCK = 'bg-[#e9ecf9]'
  const control =
    'flex items-center justify-center size-[37.5px] bg-white border border-[#e8ebf8] rounded-lg shrink-0'

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-pulse">
      <HeaderBar>
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Previous / next — a block standing in for the chevron. */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={control}>
              <span className={`size-4 rounded-[4px] ${BLOCK}`} />
            </span>
            <span className={control}>
              <span className={`size-4 rounded-[4px] ${BLOCK}`} />
            </span>
          </div>
          {/* Today — a block standing in for the label, not the text itself. */}
          <span className="flex items-center justify-center h-[37.5px] px-[14px] bg-white border border-[#e8ebf8] rounded-lg shrink-0">
            <span className={`h-[11px] w-[34px] rounded ${BLOCK}`} />
          </span>
        </div>

{/* View switcher — same four labels and box as CalendarViewSwitcher.
            The labels are real text in the skeleton colour rather than
            fixed-width blocks, so the row measures identically and the bar does
            not widen when the calendar swaps in. Keep in sync with
            VIEW_OPTIONS in CalendarClient: a non-component export from a
            'use client' module reaches the server as a client reference, not as
            an array, so it cannot be shared directly. */}
          <div className="flex items-center h-[37.5px] px-[5px] py-[6px] bg-white border border-[#e8ebf8] rounded-lg gap-[2px] shrink-0">
            {['Months', 'Week', 'Day', 'List'].map((label) => (
              <span
                key={label}
                className={`flex items-center h-[25.5px] px-[12px] rounded-[7px] text-[13px] font-semibold ${BLOCK}`}
              >
                {label}
              </span>
            ))}
          </div>
      </HeaderBar>

      <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-8 bg-[#f8f9fe] bg-[radial-gradient(circle,#dbe0f3_1px,transparent_1px)] bg-[size:22px_22px] gap-4 overflow-y-auto">
        <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.04)] p-4 sm:p-6 w-full">
          {/* CalendarSkeleton carries the month headings, each with its year
              inline; there is no separate period title above it. */}
          <CalendarSkeleton />
        </div>
      </div>
    </div>
  )
}
