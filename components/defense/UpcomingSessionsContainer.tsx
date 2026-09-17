import { DefenseCard } from './DefenseCard'
import type { MyDefenseSchedulePayload } from '@/lib/actions/defense'

interface UpcomingSessionsContainerProps {
  schedules: MyDefenseSchedulePayload[]
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Unboxed stacked list of defense session cards. Cards render directly in
 * the page flow (no container chrome) — see DefenseCard for the card design.
 */
export function UpcomingSessionsContainer({
  schedules,
  emptyTitle = 'No Upcoming Defenses',
  emptyDescription = 'Defense sessions where you are part of the panel will appear here once scheduled.',
}: UpcomingSessionsContainerProps) {
  if (schedules.length === 0) {
    return (
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
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {schedules.map((schedule) => (
        <DefenseCard key={schedule.id} schedule={schedule} />
      ))}
    </div>
  )
}
