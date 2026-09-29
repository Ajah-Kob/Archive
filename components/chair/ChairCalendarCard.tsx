import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import type { CalendarDeadline } from '@/lib/actions/chair-dashboard'
import { ChairCard } from '@/components/chair/ChairCard'

const CALENDAR = '/calendar'
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const LIST_LIMIT = 3

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Program Calendar — month grid with the next few deadlines listed.
 *
 * Marked days come from `getCalendarDeadlines`, which merges DefenseSchedule and
 * CalendarEvent. Days carrying more than one deadline show a count badge.
 *
 * The grid is driven entirely by the deadline dates rather than a month
 * cursor, so it always shows the month the work actually sits in.
 */
export function ChairCalendarCard({
  data,
  message,
}: {
  data: CalendarDeadline[] | null
  message?: string
}) {
  const view = useMemo(() => {
    if (!data || data.length === 0) return null

    const todayStart = startOfToday()
    const upcoming = data.filter((d) => d.date.getTime() >= todayStart.getTime())
    const anchor = upcoming[0] ?? data[0]
    const year = anchor.date.getFullYear()
    const month = anchor.date.getMonth()

    const first = new Date(year, month, 1)
    // getDay() is 0=Sunday, which already matches the WEEKDAYS order.
    const leadBlanks = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const byDay = new Map<number, CalendarDeadline[]>()
    for (const d of data) {
      if (d.date.getFullYear() !== year || d.date.getMonth() !== month) continue
      const day = d.date.getDate()
      const list = byDay.get(day) ?? []
      list.push(d)
      byDay.set(day, list)
    }

    return {
      year,
      month,
      label: monthLabel(anchor.date),
      leadBlanks,
      daysInMonth,
      byDay,
      upcoming,
    }
  }, [data])

  return (
    <ChairCard icon={CalendarDays} title="Calendar" href={CALENDAR}>
      {!view ? (
        <p className="px-[20px] pb-[18px] font-sans font-medium text-[11.5px] leading-[17px] text-[#9ea8c6]">
          {message ?? 'No scheduled deadlines.'}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-[20px] pb-[10px]">
            <span className="font-['Sora',sans-serif] font-bold text-[13px] leading-[18px] tracking-[-0.1px] text-[#1e2145]">
              {view.label}
            </span>
            <span className="font-sans font-bold text-[9.5px] leading-[14px] uppercase tracking-[0.9px] text-[#b0b8d4]">
              {view.byDay.size} {view.byDay.size === 1 ? 'deadline' : 'deadlines'}
            </span>
          </div>

          <div className="px-[14px]">
            <div className="grid grid-cols-7 gap-y-[2px]">
              {WEEKDAYS.map((d, i) => (
                <span
                  key={`${d}-${i}`}
                  className="text-center font-sans font-semibold text-[9.5px] leading-[14px] text-[#b0b8d4]"
                >
                  {d}
                </span>
              ))}

              {Array.from({ length: view.leadBlanks }, (_, i) => (
                <span key={`blank-${i}`} aria-hidden />
              ))}

              {Array.from({ length: view.daysInMonth }, (_, i) => {
                const day = i + 1
                const entries = view.byDay.get(day)
                const isToday = sameDay(
                  new Date(view.year, view.month, day),
                  new Date(),
                )
                const count = entries?.length ?? 0

                return (
                  <span
                    key={day}
                    title={entries?.map((e) => e.label).join('\n') ?? undefined}
                    className="relative flex h-[22px] items-center justify-center"
                  >
                    <span
                      className={`flex size-[19px] items-center justify-center rounded-full font-sans font-medium text-[10px] leading-[14px] tabular-nums ${
                        isToday
                          ? 'bg-[#ef4444] font-bold text-white'
                          : count > 0
                            ? 'text-[#707dff]'
                            : 'text-[#5a6382]'
                      }`}
                    >
                      {day}
                    </span>
                    {count > 0 && !isToday && (
                      <span className="absolute -bottom-[1px] right-[3px] flex size-[12px] items-center justify-center rounded-full bg-[#707dff] font-sans font-bold text-[8px] leading-[12px] text-white">
                        {count}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="mt-[12px] flex flex-col gap-[7px] border-t border-[#f0f2fa] px-[20px] pt-[12px] pb-[16px]">
            {view.upcoming.slice(0, LIST_LIMIT).map((d) => (
              <div key={d.id} className="flex items-center gap-[9px]">
                <span
                  className={`flex size-[22px] shrink-0 items-center justify-center rounded-[6px] font-sans font-bold text-[9.5px] leading-[14px] tabular-nums ${
                    d.kind === 'DEFENSE'
                      ? 'bg-[#eef2ff] text-[#707dff]'
                      : 'bg-[#fdf2f8] text-[#db2777]'
                  }`}
                >
                  {d.date.getDate()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-sans font-semibold text-[11px] leading-[15px] text-[#1e2145]">
                    {d.label}
                  </span>
                  <span className="block font-sans font-medium text-[9.5px] leading-[14px] text-[#8a93b4]">
                    {shortDate(d.date)}
                  </span>
                </span>
              </div>
            ))}

            {view.upcoming.length > LIST_LIMIT && (
              <p className="pl-[31px] font-sans font-medium text-[10px] leading-[15px] text-[#8a93b4]">
                +{view.upcoming.length - LIST_LIMIT} more
              </p>
            )}
          </div>
        </>
      )}
    </ChairCard>
  )
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
