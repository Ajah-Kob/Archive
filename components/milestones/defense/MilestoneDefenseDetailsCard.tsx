'use client'

import { Calendar, Clock, Crown, MapPin, User } from 'lucide-react'
import type { DefenseVerdict, PanelistRole } from '@prisma/client'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'
import { getInitials } from '@/lib/helper'
import {
  UserProfile,
  PANELIST_AVATAR_GRADIENT,
} from '@/components/ui/UserProfile'
import { deriveFeedbackText as deriveFeedbackTextHelper } from '@/lib/defense/session-helpers'

interface MilestoneDefenseDetailsCardProps {
  schedule: DefenseSchedulePayload | null
}

// ── Date / time helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const weekday = date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const label = weekday === 'Thu' ? 'Thur' : weekday
  const rest = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return `${label}, ${rest}`
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

function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

function deriveFeedbackText(
  verdict: string,
  feedback: { comments: number; pages: number } | null | undefined,
): string {
  const v = (verdict as DefenseVerdict) ?? 'PENDING'
  return deriveFeedbackTextHelper(v, feedback)
}

// ── Root / Header / Grid (Figma 1490:5133) ─────────────────────────────────
// Root: same chrome as session card but non-scrollable.
// Header: Defense Details 12.5px Sora Bold #1e3a8a
// Grid: 1fr 3fr gap 12px px 18 py 14 (not single-col)

function CardRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e8ebf8] flex flex-col items-start overflow-clip p-px rounded-[14px] w-full shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  )
}

function CardHeader() {
  return (
    <div className="border-[#f0f2fa] border-b w-full shrink-0">
      <div className="flex items-center px-[18px] pt-[15px] pb-[16px] w-full">
        <p className="font-['Sora',sans-serif] font-bold text-[12.5px] leading-[normal] tracking-[-0.125px] text-[#1e3a8a]">
          Defense Details
        </p>
      </div>
    </div>
  )
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] gap-[12px] px-[18px] py-[14px]">
      {children}
    </div>
  )
}

// ── Schedule (left, vertical stack) ───────────────────────────────────────
// Figma: left container flex col gap 10, Schedule label 12px Bold #9ea8c6,
// 3 pill cards Date/Time/Venue each with 26px icon, label 11px medium #9ea8c6,
// value 11px Sora Semibold #1e3a8a, cards border #e8ebf8 rounded 10px shadow.

function SchedulePill({
  icon,
  label,
  value,
  isFirst,
  isLast,
}: {
  icon: React.ReactNode
  label: string
  value: string
  isFirst?: boolean
  isLast?: boolean
}) {
  const radius = isFirst
    ? 'rounded-tl-[10px] rounded-tr-[10px]'
    : isLast
      ? 'rounded-bl-[10px] rounded-br-[10px]'
      : ''
  const border = isLast
    ? 'border border-[#e8ebf8]'
    : 'border-l border-r border-t border-[#e8ebf8]'
  return (
    <div
      className={`bg-white ${border} ${radius} flex items-center gap-[10px] px-[17px] py-[11px] w-full h-full`}
    >
      <div className="size-[26px] rounded-[8px] bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.10)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex flex-col min-w-0 h-[34px] justify-between">
        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[11px] leading-[normal] text-[#9ea8c6]">
          {label}
        </span>
        <span className="font-['Sora',sans-serif] font-semibold text-[11px] leading-[normal] tracking-[-0.125px] text-[#1e3a8a] truncate">
          {value}
        </span>
      </div>
    </div>
  )
}

function ScheduleColumn({
  schedule,
}: {
  schedule: DefenseSchedulePayload | null
}) {
  const dateText = schedule?.date ? formatDate(schedule.date) : '—'
  const timeText = schedule
    ? formatTimeRange(schedule.startTime, schedule.endTime)
    : '—'
  const venueText = schedule?.venue ?? '—'

  return (
    <div className="flex flex-col gap-[10px] self-start w-full h-full min-w-0">
      <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#9ea8c6]">
        Schedule
      </p>
      <div className="flex flex-col w-full h-full overflow-clip rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)]">
        <SchedulePill
          icon={
            <Calendar
              className="size-[13px] text-[#707dff] shrink-0"
              strokeWidth={2}
            />
          }
          label="Date"
          value={dateText}
          isFirst
        />
        <SchedulePill
          icon={
            <Clock
              className="size-[13px] text-[#707dff] shrink-0"
              strokeWidth={2}
            />
          }
          label="Time"
          value={timeText}
        />
        <SchedulePill
          icon={
            <MapPin
              className="size-[13px] text-[#707dff] shrink-0"
              strokeWidth={2}
            />
          }
          label="Venue"
          value={venueText}
          isLast
        />
      </div>
    </div>
  )
}

// ── Panelist (right, 3 rows grid 2fr 2fr 1fr) ───────────────────────────────

function PanelPill({ role }: { role: PanelistRole }) {
  if (role === 'CHAIR') {
    return (
      <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.13)] px-[10px] py-[3px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#f59e0b] whitespace-nowrap shrink-0">
        <Crown className="size-[12px]" strokeWidth={2} />
        Chair
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.13)] px-[10px] py-[3px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#707dff] whitespace-nowrap shrink-0">
      <User className="size-[12px]" strokeWidth={2} />
      Member
    </span>
  )
}

type PanelistRowProps = {
  panelist: DefenseSchedulePayload['panelists'][number]
  verdict: string
  isFirst: boolean
  isLast: boolean
}

function PanelistRow({ panelist, verdict, isFirst, isLast }: PanelistRowProps) {
  const radius = isFirst
    ? 'rounded-tl-[10px] rounded-tr-[10px]'
    : isLast
      ? 'rounded-bl-[10px] rounded-br-[10px]'
      : ''
  const border = isLast
    ? 'border border-[#e8ebf8]'
    : 'border-l border-r border-t border-[#e8ebf8]'
  const feedback = (
    panelist as unknown as {
      feedback?: { comments: number; pages: number } | null
    }
  ).feedback
  const centerText = deriveFeedbackText(verdict, feedback)

  return (
    <div
      className={`bg-white ${border} ${radius} grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)] max-sm:grid-cols-1 max-sm:gap-2 items-center px-[17px] py-[6px] min-h-[61px] gap-2`}
    >
      <div className="flex items-center gap-2.5 min-w-0 sm:h-[50px] w-full">
        <UserProfile
          initials={getInitials(panelist.name)}
          name={panelist.name}
          email={panelist.email}
          gradient={panelist.avatarGradient ?? PANELIST_AVATAR_GRADIENT}
          avatarClassName="size-[35px]"
        />
      </div>
      <div className="flex items-center justify-center sm:h-[50px] sm:px-2 min-w-0 w-full">
        <p
          className={`font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-center ${
            centerText.startsWith('✓') ? 'text-[#16a34a]' : 'text-[#9ea8c6]'
          }`}
        >
          {centerText}
        </p>
      </div>
      <div className="flex items-center justify-end sm:h-[50px] shrink-0 w-full sm:w-auto">
        <PanelPill role={panelist.role} />
      </div>
    </div>
  )
}

function PanelistColumn({
  panelists,
  verdict,
}: {
  panelists: DefenseSchedulePayload['panelists']
  verdict: string
}) {
  const chair = panelists.find((p) => p.role === 'CHAIR') ?? null
  const members = panelists.filter((p) => p.role === 'PANEL_MEMBER')
  const ordered = chair ? [chair, ...members] : members

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col gap-[10px] self-start w-full min-w-0">
        <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#9ea8c6]">
          Panelist
        </p>
        <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
          No panelists have been assigned yet.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[10px] self-start w-full min-w-0">
      <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#9ea8c6]">
        Panelist
      </p>
      <div className="bg-white flex flex-col rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full overflow-clip">
        {ordered.map((panelist, index) => (
          <PanelistRow
            key={panelist.userId}
            panelist={panelist}
            verdict={verdict}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

// ── Public card (milestone student only, no Members, no Details) ───────────

/**
 * MilestoneDefenseDetailsCard — student milestone defense (Figma 1490:5133).
 * Separate from the session Details card (Session Details with Details+Panelist+Members scrollable).
 * Layout: Header Defense Details + Grid 1fr:3fr, left Schedule stacked 3 pills, right Panelist 2fr/2fr/1fr.
 * No Members section, no Details (Team) section.
 */
export function MilestoneDefenseDetailsCard({
  schedule,
}: MilestoneDefenseDetailsCardProps) {
  const panelists = schedule?.panelists ?? []
  const verdict = schedule?.verdict ?? 'PENDING'

  return (
    <CardRoot>
      <CardHeader />
      <CardGrid>
        <ScheduleColumn schedule={schedule} />
        <PanelistColumn panelists={panelists} verdict={verdict} />
      </CardGrid>
    </CardRoot>
  )
}

export type { MilestoneDefenseDetailsCardProps }
