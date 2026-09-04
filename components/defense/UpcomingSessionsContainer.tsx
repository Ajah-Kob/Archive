import { MessageSquare } from 'lucide-react'
import { DefenseCard } from './DefenseCard'
import type { MyDefenseSchedulePayload } from '@/lib/actions/defense'

interface UpcomingSessionsContainerProps {
  schedules: MyDefenseSchedulePayload[]
  title?: string
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Upcoming Session Container (Figma 1416:7622) — the white card that holds the
 * list of upcoming defense sessions. Header ("Upcoming Sessions" + icon chip)
 * sits above a stacked list of Defense Cards.
 */
export function UpcomingSessionsContainer({
  schedules,
  title = 'Upcoming Sessions',
  emptyTitle = 'No Upcoming Defenses',
  emptyDescription = 'Defense sessions where you are part of the panel will appear here once scheduled.',
}: UpcomingSessionsContainerProps) {
  return (
    <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="border-b border-[#f0f2fa] px-[16px] pt-[14px] pb-[15px] shrink-0">
        <div className="flex items-center gap-[7px]">
          <div className="size-[26px] rounded-[7px] bg-[rgba(112,125,255,0.05)] flex items-center justify-center shrink-0">
            <MessageSquare className="size-[12px] text-[#707dff]" strokeWidth={2} />
          </div>
          <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px] whitespace-nowrap">
            {title}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-[10px] p-[20px]">
        {schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-10 py-16 text-center">
            <img
              src="/no-defense-icon.svg"
              alt=""
              className="size-[96px] mb-4"
            />
            <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#10133a] tracking-[-0.16px] mb-2">
              {emptyTitle}
            </h3>
            <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] max-w-sm">
              {emptyDescription}
            </p>
          </div>
        ) : (
          schedules.map((schedule) => (
            <DefenseCard key={schedule.id} schedule={schedule} />
          ))
        )}
      </div>
    </div>
  )
}