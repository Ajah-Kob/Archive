'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  Crown,
  MapPin,
  Shield,
  User,
} from 'lucide-react'
import type { MyDefenseSchedulePayload } from '@/lib/actions/defense'

// ── Pure helpers (duplicated locally, matching the codebase pattern) ─────────

// Schedules store a date-only value at UTC midnight, so format in UTC too —
// otherwise the displayed day can shift in negative-offset timezones.
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
// "9:00 AM" display format.
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

// ── Sub-components (Figma 1418:9207 Defense Type) ────────────────────────────

function DefenseTypeBadge({ type }: { type: MyDefenseSchedulePayload['type'] }) {
  const isFinal = type === 'FINAL'
  return (
    <div
      className={`flex items-center justify-center gap-[6px] min-w-[148px] px-[11px] py-[5px] rounded-[8px] border border-solid shrink-0 ${
        isFinal
          ? 'bg-[rgba(254,111,111,0.07)] border-[rgba(254,111,111,0.18)]'
          : 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.18)]'
      }`}
    >
      <Shield
        className={`size-[9px] ${isFinal ? 'text-[#fe6f6f]' : 'text-[#707dff]'}`}
        strokeWidth={2}
      />
      <p
        className={`font-sans font-bold text-[11.5px] leading-[17.25px] whitespace-nowrap ${
          isFinal ? 'text-[#fe6f6f]' : 'text-[#707dff]'
        }`}
      >
        {isFinal ? 'Final Defense' : 'Proposal Defense'}
      </p>
    </div>
  )
}

// ── Panel role (Figma 1418:9239) ─────────────────────────────────────────────

function PanelRole({ role }: { role: MyDefenseSchedulePayload['myRole'] }) {
  const isChair = role === 'CHAIR'
  return (
    <div className="flex items-center gap-[5px] flex-1 min-w-px">
      {isChair ? (
        <Crown className="size-[12px] text-[#f59e0b]" strokeWidth={2} />
      ) : (
        <User className="size-[12px] text-[#707dff]" strokeWidth={2} />
      )}
      <p
        className={`font-sans font-bold text-[12px] leading-[18px] whitespace-nowrap ${
          isChair ? 'text-[#f59e0b]' : 'text-[#707dff]'
        }`}
      >
        {isChair ? 'Panel Chair' : 'Panel Member'}
      </p>
    </div>
  )
}

// ── Open Session button (Figma 1418:9433 Accepted state) ─────────────────────

function OpenSessionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Open defense session workspace"
      className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[8px] border border-[rgba(112,125,255,0.6)] drop-shadow-[0px_2px_3px_rgba(112,125,255,0.22)] font-sans font-bold text-[12px] leading-[18px] text-white whitespace-nowrap shrink-0 transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
      style={{
        backgroundImage: 'linear-gradient(164.67deg, #707dff 0%, #5565ff 100%)',
      }}
    >
      <ArrowRight className="size-[7px] text-white" strokeWidth={2.5} />
      Open Session
    </button>
  )
}

// ── Defense Card (Figma 1418:9327) ───────────────────────────────────────────

interface DefenseCardProps {
  schedule: MyDefenseSchedulePayload
}

/**
 * Compact card representing one upcoming defense session where the current
 * faculty member sits on the panel. Reproduces the Figma Defense Card exactly:
 * type badge → group/section → date & time → venue → panel role → Open Session.
 */
export function DefenseCard({ schedule }: DefenseCardProps) {
  const router = useRouter()

  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex items-center gap-[20px] p-[17px] w-full shrink-0">
      <DefenseTypeBadge type={schedule.type} />

      {/* Group + section */}
      <div className="min-w-[130px] shrink-0">
        <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#10133a] whitespace-nowrap">
          {schedule.groupName}
        </p>
        <p className="pt-[2px] font-sans font-semibold text-[11px] leading-[16.5px] text-[#9ea8c6] whitespace-nowrap">
          {schedule.sectionName}
        </p>
      </div>

      {/* Date & time */}
      <div className="min-w-[170px] w-[170px] shrink-0 flex items-center gap-[5px]">
        <CalendarDays className="size-[11px] text-[#bbc0d8]" strokeWidth={2} />
        <p className="font-sans font-semibold text-[12px] leading-[18px] text-[#4a5280] whitespace-nowrap">
          {formatDate(schedule.date)} · {formatTime(schedule.startTime)}
        </p>
      </div>

      {/* Venue */}
      <div className="min-w-[110px] w-[110px] shrink-0 flex items-center gap-[5px]">
        <MapPin className="size-[11px] text-[#bbc0d8]" strokeWidth={2} />
        <p className="font-sans font-medium text-[12px] leading-[18px] text-[#6b7399] whitespace-nowrap">
          {schedule.venue}
        </p>
      </div>

      <PanelRole role={schedule.myRole} />
      <OpenSessionButton
        onClick={() => router.push(`/faculty/defense/${schedule.id}`)}
      />
    </div>
  )
}