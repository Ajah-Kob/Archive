import type { ReactNode } from 'react'
import { Calendar, Clock, MapPin, Shield } from 'lucide-react'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const weekday = date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const weekdayLabel = weekday === 'Thu' ? 'Thur' : weekday
  const rest = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return `${weekdayLabel}, ${rest}`
}

function formatTime(value: string): string {
  const trimmed = value.trim()
  const explicit = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/)
  if (explicit)
    return `${parseInt(explicit[1], 10)}:${explicit[2]} ${explicit[3].toUpperCase()}`
  const hourOnly = trimmed.match(/^(\d{1,2})\s*(AM|PM|am|pm)$/)
  if (hourOnly)
    return `${parseInt(hourOnly[1], 10)}:00 ${hourOnly[2].toUpperCase()}`
  const military = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (military) {
    const hour = parseInt(military[1], 10)
    const minutes = military[2]
    if (hour === 0 || hour === 24) return `12:${minutes} AM`
    if (hour < 12) return `${hour}:${minutes} AM`
    if (hour === 12) return `12:${minutes} PM`
    return `${hour - 12}:${minutes} PM`
  }
  return value
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`
}

function resolveBadgeLabel(type: string | undefined): string {
  return type === 'FINAL' ? 'Final Defense' : 'Proposal Defense'
}

function DetailItem({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <div className="flex gap-[6px] items-center">
      {icon}
      <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[12.5px] leading-[normal] text-[#4a5280] whitespace-nowrap">
        {children}
      </span>
    </div>
  )
}

function DetailsCard({
  schedule,
}: {
  schedule: DefenseSchedulePayload | null
}) {
  const groupName = schedule?.groupName ? schedule.groupName : 'TEAM 5: ARCHIVE'
  const sectionName = schedule?.sectionName ?? 'BSIS 4AG2'
  const dateText = schedule?.date
    ? formatDate(schedule.date)
    : 'Thur, August 30, 2026'
  const timeText = schedule
    ? formatTimeRange(schedule.startTime, schedule.endTime)
    : '2:00 PM – 3:00 PM'
  const venueText = schedule?.venue ?? 'Room 204'
  const badgeLabel = resolveBadgeLabel(schedule?.type)

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] drop-shadow-[0px_2px_6px_rgba(112,125,255,0.05)] flex items-start px-[16px] py-[8px] w-full flex-col lg:flex-row gap-0">
      {/* Group and Section Info — hugs content, extends with the name */}
      <div className="w-fit max-w-full p-[10px] shrink-0 flex flex-col gap-[2px]">
        <p className="font-['Sora',sans-serif] font-extrabold text-[20px] leading-[normal] tracking-[-0.44px] text-[#10133a] whitespace-nowrap">
          {groupName}
        </p>
        <p className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[12.5px] leading-[normal] text-[#8a93b4]">
          {sectionName}
        </p>
      </div>

      {/* Schedule Info */}
      <div className="flex-1 gap-[15px] h-full items-center p-[10px] flex flex-wrap min-w-0">
        <DetailItem
          icon={
            <Calendar
              className="size-[11px] text-[#8a93b4] shrink-0"
              strokeWidth={2}
            />
          }
        >
          {dateText}
        </DetailItem>
        <DetailItem
          icon={
            <Clock
              className="size-[11px] text-[#8a93b4] shrink-0"
              strokeWidth={2}
            />
          }
        >
          {timeText}
        </DetailItem>
        <DetailItem
          icon={
            <MapPin
              className="size-[11px] text-[#8a93b4] shrink-0"
              strokeWidth={2}
            />
          }
        >
          {venueText}
        </DetailItem>
      </div>

      {/* Defense Type */}
      <div className="w-full h-full max-lg:w-full lg:w-[162px] shrink-0 flex flex-col items-end justify-center">
        <div className="inline-flex items-center gap-[6px] px-[11px] py-[5px] rounded-[8px] bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.18)]">
          <Shield
            className="size-[11px] text-[#3b82f6] shrink-0"
            strokeWidth={2}
          />
          <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[11.5px] leading-[normal] text-[#3b82f6] whitespace-nowrap">
            {badgeLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

type DefenseDetailsScheduleProps = {
  schedule: DefenseSchedulePayload | null
}

export function DefenseDetailsSchedule({
  schedule,
}: DefenseDetailsScheduleProps) {
  return (
    <div className="flex flex-col gap-[10px] self-stretch min-w-0">
      <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#9ea8c6]">
        Details
      </p>
      <DetailsCard schedule={schedule} />
    </div>
  )
}
