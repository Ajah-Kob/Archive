'use client'

import { Calendar, Clock, Crown, MapPin, User } from 'lucide-react'
import type { PanelistRole } from '@prisma/client'
import type {
  DefensePanelistPayload,
  DefenseSchedulePayload,
} from '@/lib/actions/defense'
import { getInitials } from '@/lib/helper'

// ── Pure helpers ─────────────────────────────────────────────────────────────

// Reuses the UTC-safe date formatter from DefenseDataRow / DefenseDetailsDrawer
// so the displayed day is consistent across all defense views.
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

// Normalizes the wizard's time strings ("09:00", "9:00 AM", "9 AM") into the
// "9:00 AM" display format — mirrors DefenseDataRow and DefenseDetailsDrawer.
function formatTime(value: string): string {
  const trimmed = value.trim()

  const explicit = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/)
  if (explicit) {
    return `${parseInt(explicit[1], 10)}:${explicit[2]} ${explicit[3].toUpperCase()}`
  }

  const hourOnly = trimmed.match(/^(\d{1,2})\s*(AM|PM|am|pm)$/)
  if (hourOnly) {
    return `${parseInt(hourOnly[1], 10)}:00 ${hourOnly[2].toUpperCase()}`
  }

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

// Same avatar palette as DefenseDetailsDrawer so faces stay consistent app-wide.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #fe6f6f, #e85555)',
  'linear-gradient(135deg, #f59e0b, #e08800)',
  'linear-gradient(135deg, #22c55e, #16a34a)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #707dff, #5565ff)',
]

function gradientFor(userId: number): string {
  return AVATAR_GRADIENTS[userId % AVATAR_GRADIENTS.length]
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-3">
      {children}
    </p>
  )
}

/** Single info row inside the schedule block (icon + label + value). */
function ScheduleRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="size-[30px] rounded-lg bg-[rgba(112,125,255,0.05)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#a0abcc]">
          {label}
        </span>
        <span className="truncate font-sans font-semibold text-[13px] leading-[19.5px] text-[#1e2145]">
          {value}
        </span>
      </div>
    </div>
  )
}

/** Role pill — Chair gets a gold crown pill, members get a purple user pill. */
function PanelPill({ role }: { role: PanelistRole }) {
  if (role === 'CHAIR') {
    return (
      <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.13)] px-[10px] py-[3px] font-sans font-bold text-[12px] leading-[18px] text-[#f59e0b] whitespace-nowrap shrink-0">
        <Crown className="size-[12px]" strokeWidth={2} />
        Panel Chair
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.13)] px-[10px] py-[3px] font-sans font-bold text-[12px] leading-[18px] text-[#707dff] whitespace-nowrap shrink-0">
      <User className="size-[12px]" strokeWidth={2} />
      Panel Member
    </span>
  )
}

/**
 * Panelist row — 40px gradient avatar + name + email + role pill.
 * Matches the Figma "Panelist Details" design (node 1448-6464): rows are
 * joined into a single bordered container with shared hairlines.
 */
function PanelistCard({
  panelist,
  isFirst,
  isLast,
}: {
  panelist: DefensePanelistPayload
  isFirst?: boolean
  isLast?: boolean
}) {
  const radiusClass = isFirst
    ? 'rounded-tl-[10px] rounded-tr-[10px]'
    : isLast
      ? 'rounded-bl-[10px] rounded-br-[10px]'
      : ''
  const borderClass = isLast
    ? 'border border-[#e8ebf8]'
    : 'border-l border-r border-t border-[#e8ebf8]'

  return (
    <div
      className={`bg-white ${borderClass} ${radiusClass} flex items-center justify-between gap-[12px] px-[17px] py-[9px]`}
    >
      <div className="flex items-center gap-[10px] min-w-0">
        <div
          className="size-[40px] rounded-full flex items-center justify-center shrink-0 drop-shadow-[0px_3px_4px_rgba(0,0,0,0.14)]"
          style={{ backgroundImage: gradientFor(panelist.userId) }}
        >
          <span className="font-sans font-bold text-[12.8px] text-white tracking-[0.384px]">
            {getInitials(panelist.name)}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <p className="truncate font-sora font-bold text-[12.5px] leading-[16.25px] text-[#1e3a8a] tracking-[-0.125px]">
            {panelist.name}
          </p>
          <p className="truncate pt-[2px] font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
            {panelist.email}
          </p>
        </div>
      </div>
      <PanelPill role={panelist.role} />
    </div>
  )
}

/** Empty state when no panelists have been assigned yet. */
function EmptyPanelists() {
  return (
    <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
      No panelists have been assigned yet.
    </p>
  )
}

// ── Root component ───────────────────────────────────────────────────────────

interface DefenseDetailsCardProps {
  /** Defense schedule data — null when no schedule has been created yet. */
  schedule: DefenseSchedulePayload | null
}

/**
 * Presentational card that displays defense schedule details (date, time,
 * venue) and the panelist roster. Accepts data as props — the parent page
 * is responsible for fetching.
 *
 * Reuses the same visual patterns (ScheduleRow, PanelistCard, gradients)
 * found in DefenseDetailsDrawer and DefenseSessionView so the card feels
 * consistent across faculty and student views.
 */
export function DefenseDetailsCard({ schedule }: DefenseDetailsCardProps) {
  // Sort panelists: Chair first, then Members in order.
  const chair = schedule?.panelists.find((p) => p.role === 'CHAIR') ?? null
  const members = schedule?.panelists.filter((p) => p.role === 'PANEL_MEMBER') ?? []
  const orderedPanelists = chair ? [chair, ...members] : members
  const hasPanelists = orderedPanelists.length > 0

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-[22px]">
      {/* ── Schedule section ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-[10px]">
        <SectionLabel>Schedule</SectionLabel>
        {schedule ? (
          <div className="border border-[#e8ebf8] rounded-[10px] divide-y divide-[#f0f2fa]">
            <ScheduleRow
              icon={<Calendar className="size-[14px] text-[#707dff]" strokeWidth={2} />}
              label="Date"
              value={formatDate(schedule.date)}
            />
            <ScheduleRow
              icon={<Clock className="size-[14px] text-[#707dff]" strokeWidth={2} />}
              label="Time"
              value={`${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`}
            />
            <ScheduleRow
              icon={<MapPin className="size-[14px] text-[#707dff]" strokeWidth={2} />}
              label="Venue"
              value={schedule.venue}
            />
          </div>
        ) : (
          <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
            No defense schedule has been set yet.
          </p>
        )}
      </div>

      {/* ── Panelists section ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-[10px]">
        <SectionLabel>Panelist</SectionLabel>
        {hasPanelists ? (
          <div className="flex flex-col">
            {orderedPanelists.map((panelist, index) => (
              <PanelistCard
                key={panelist.userId}
                panelist={panelist}
                isFirst={index === 0}
                isLast={index === orderedPanelists.length - 1}
              />
            ))}
          </div>
        ) : (
          <EmptyPanelists />
        )}
      </div>
    </div>
  )
}
