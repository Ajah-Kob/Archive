'use client'

import Link from 'next/link'
import {
  CalendarDays,
  Crown,
  MapPin,
  Shield,
  User,
} from 'lucide-react'
import { getInitials } from '@/lib/helper'
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

// ── Type badge (white chip for tinted headers) ───────────────────────────────

function DefenseTypeBadge({ type }: { type: MyDefenseSchedulePayload['type'] }) {
  const isFinal = type === 'FINAL'
  return (
    <div
      className={`flex items-center justify-center gap-[5px] px-[9px] py-[5px] rounded-[8px] border border-solid bg-white shrink-0 self-center ${
        isFinal ? 'border-[rgba(254,111,111,0.4)]' : 'border-[rgba(112,125,255,0.35)]'
      }`}
    >
      <Shield
        className={`size-[9px] ${isFinal ? 'text-[#fe6f6f]' : 'text-[#707dff]'}`}
        strokeWidth={2}
      />
      <p
        className={`font-sans font-bold text-[11px] leading-[16.5px] whitespace-nowrap ${
          isFinal ? 'text-[#fe6f6f]' : 'text-[#707dff]'
        }`}
      >
        {isFinal ? 'Final Defense' : 'Proposal Defense'}
      </p>
    </div>
  )
}

// ── Member avatar stack ──────────────────────────────────────────────────────

const AVATAR_PREVIEW_COUNT = 4

function MemberAvatars({
  members,
}: {
  members: MyDefenseSchedulePayload['members']
}) {
  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center size-[28px] rounded-full border-2 border-dashed border-[#e0e3f0] bg-[#fafbff] shrink-0">
        <span className="font-sans font-bold text-[10px] text-[#b0b8d4] text-center">
          —
        </span>
      </div>
    )
  }
  const shown = members.slice(0, AVATAR_PREVIEW_COUNT)
  const overflow = members.length - shown.length
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((member) => (
        <div
          key={member.userId}
          title={member.name}
          className="flex items-center justify-center size-[28px] rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] shrink-0"
          style={{
            backgroundImage:
              'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
          }}
        >
          <span className="font-heading font-bold text-[10px] leading-[15px] text-white tracking-[0.3px]">
            {getInitials(member.name)}
          </span>
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex items-center justify-center size-[28px] rounded-full bg-[#eef0ff] border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] shrink-0">
          <span className="font-sans font-bold text-[10px] text-[#707dff]">
            +{overflow}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Verdict dot (outcome indicator under the venue row) ─────────────────────

function verdictDotColor(verdict: MyDefenseSchedulePayload['verdict']): string {
  switch (verdict) {
    case 'APPROVED':
      return '#16a34a'
    case 'MINOR_REVISION':
      return '#f59e0b'
    case 'MAJOR_REVISION':
      return '#e1681d'
    case 'REDEFENSE':
      return '#e11d48'
    default:
      return '#9fa5b7'
  }
}

function verdictLabel(verdict: MyDefenseSchedulePayload['verdict']): string {
  switch (verdict) {
    case 'APPROVED':
      return 'Approved'
    case 'MINOR_REVISION':
      return 'Minor Revision'
    case 'MAJOR_REVISION':
      return 'Major Revision'
    case 'REDEFENSE':
      return 'Redefense'
    default:
      return 'No Verdict'
  }
}

// ── Panel role (tells the faculty user their seat) ───────────────────────────

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

// ── Defense Card (SectionCard shape) ─────────────────────────────────────────

interface DefenseCardProps {
  schedule: MyDefenseSchedulePayload
}

/**
 * SectionCard-shaped card for one defense session. Tinted type-colored
 * header (group + section, type badge docked right), body with member
 * avatar stack, date/time/venue rows, panel role, and Open Session.
 * The whole card links to the defense session workspace.
 */
export function DefenseCard({ schedule }: DefenseCardProps) {
  const isFinal = schedule.type === 'FINAL'
  const workspaceHref = `/faculty/defense/${schedule.id}`

  return (
    <Link href={workspaceHref} className="block group/card">
      <div className="bg-white flex flex-col items-start overflow-clip relative rounded-[8px] border border-[#eceef8] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full hover:shadow-[0px_8px_24px_0px_rgba(30,58,138,0.12),0px_2px_8px_0px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-[rgba(112,125,255,0.22)] transition-all duration-200 will-change-transform">
        {/* Header — my-section palette purple for proposal, section rose for final */}
        <div
          className={`border-b border-solid flex flex-col px-[20px] pt-[16px] pb-[14px] relative shrink-0 w-full ${
            isFinal ? 'bg-[#fecdd3] border-[#fda4af]' : 'bg-[#c7d2fe] border-[#a5b4fc]'
          }`}
        >
          <div className="flex items-center justify-between gap-3 relative shrink-0 w-full">
            <div className="min-w-0">
              <p
                className={`font-['Sora',sans-serif] font-extrabold leading-[normal] text-[18px] tracking-[-0.15px] whitespace-nowrap min-w-0 truncate ${
                  isFinal ? 'text-[#881337]' : 'text-[#1e3a8a]'
                }`}
              >
                {schedule.groupName}
              </p>
              <p
                className={`pt-[2px] font-sans font-semibold text-[12.5px] leading-[18px] whitespace-nowrap ${
                  isFinal ? 'text-[#881337]/75' : 'text-[#1e3a8a]/75'
                }`}
              >
                {schedule.sectionName}
              </p>
            </div>
            <DefenseTypeBadge type={schedule.type} />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-[10px] p-[16px] relative shrink-0 w-full">
          {/* Members row */}
          <div className="flex items-center gap-2">
            <MemberAvatars members={schedule.members} />
            <span className="font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#5a6382] pl-1">
              {schedule.members.length}{' '}
              {schedule.members.length === 1 ? 'Member' : 'Members'}
            </span>
          </div>

          {/* Panel role */}
          <PanelRole role={schedule.myRole} />

          {/* Date & time */}
          <div className="flex items-center gap-[5px]">
            <CalendarDays className="size-[11px] text-[#bbc0d8] shrink-0" strokeWidth={2} />
            <p className="font-sans font-semibold text-[12px] leading-[18px] text-[#4a5280] whitespace-nowrap">
              {formatDate(schedule.date)} · {formatTime(schedule.startTime)}
              {schedule.endTime ? ` – ${formatTime(schedule.endTime)}` : ''}
            </p>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-[5px]">
            <MapPin className="size-[11px] text-[#bbc0d8] shrink-0" strokeWidth={2} />
            <p className="font-sans font-semibold text-[12px] leading-[18px] text-[#4a5280] whitespace-nowrap">
              {schedule.venue}
            </p>
          </div>

          {/* Verdict */}
          <div className="flex items-center gap-[5px]">
            <span
              aria-hidden="true"
              className="size-[8px] rounded-full shrink-0 opacity-75"
              style={{ backgroundColor: verdictDotColor(schedule.verdict) }}
            />
            <p className="font-sans font-semibold text-[12px] leading-[18px] text-[#4a5280] whitespace-nowrap">
              {verdictLabel(schedule.verdict)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
