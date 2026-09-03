import type { ReactNode } from 'react'
import { Calendar, Clock, MapPin } from 'lucide-react'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
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

function ScheduleIcon({ children }: { children: ReactNode }) {
  return (
    <div className="size-[26px] rounded-[8px] bg-[#f8f9ff] border border-[#eef0ff] flex items-center justify-center shrink-0">
      {children}
    </div>
  )
}

function ScheduleLabel({ children }: { children: string }) {
  return (
    <span className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[11px] leading-[normal] text-[#9ea8c6]">
      {children}
    </span>
  )
}

function ScheduleValue({ children }: { children: ReactNode }) {
  return (
    <span className="font-['Sora',sans-serif] font-semibold text-[11px] leading-[normal] tracking-[-0.125px] text-[#1e3a8a]">
      {children}
    </span>
  )
}

function DateRow({ schedule }: { schedule: DefenseSchedulePayload }) {
  return (
    <div className="h-full border border-[#e8ebf8] border-b-0 rounded-tl-[10px] rounded-tr-[10px] flex flex-col justify-center px-[17px] py-[11px] w-full">
      <div className="flex gap-[10px] items-center w-full">
        <ScheduleIcon>
          <Calendar className="size-[14px] text-[#9ea8c6]" strokeWidth={1.75} />
        </ScheduleIcon>
        <div className="flex flex-col gap-0.5 min-w-0">
          <ScheduleLabel>Date</ScheduleLabel>
          <ScheduleValue>{formatDate(schedule.date)}</ScheduleValue>
        </div>
      </div>
    </div>
  )
}

function TimeRow({ schedule }: { schedule: DefenseSchedulePayload }) {
  return (
    <div className="h-full border-x border-t border-[#e8ebf8] flex flex-col justify-center px-[17px] py-[11px] w-full">
      <div className="flex gap-[10px] items-center w-full">
        <ScheduleIcon>
          <Clock className="size-[14px] text-[#9ea8c6]" strokeWidth={1.75} />
        </ScheduleIcon>
        <div className="flex flex-col gap-0.5 min-w-0">
          <ScheduleLabel>Time</ScheduleLabel>
          <ScheduleValue>
            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
          </ScheduleValue>
        </div>
      </div>
    </div>
  )
}

function VenueRow({ schedule }: { schedule: DefenseSchedulePayload }) {
  return (
    <div className="h-full border border-[#e8ebf8] rounded-bl-[10px] rounded-br-[10px] flex flex-col justify-center px-[17px] py-[11px] w-full">
      <div className="flex gap-[10px] items-center w-full">
        <ScheduleIcon>
          <MapPin className="size-[14px] text-[#9ea8c6]" strokeWidth={1.75} />
        </ScheduleIcon>
        <div className="flex flex-col gap-0.5 min-w-0">
          <ScheduleLabel>Venue</ScheduleLabel>
          <span className="font-['Sora',sans-serif] font-semibold text-[11px] leading-[normal] tracking-[-0.125px] text-[#1e3a8a] truncate">
            {schedule.venue}
          </span>
        </div>
      </div>
    </div>
  )
}

function ScheduleCard({ schedule }: { schedule: DefenseSchedulePayload }) {
  return (
    <div className="bg-white flex flex-col flex-1 rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full overflow-clip">
      <DateRow schedule={schedule} />
      <TimeRow schedule={schedule} />
      <VenueRow schedule={schedule} />
    </div>
  )
}

function ScheduleEmpty() {
  return (
    <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
      No defense schedule has been set yet.
    </p>
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
        Schedule
      </p>
      {schedule ? <ScheduleCard schedule={schedule} /> : <ScheduleEmpty />}
    </div>
  )
}
