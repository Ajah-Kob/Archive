'use client'

import { Eye, Trash2 } from 'lucide-react'
import type { DefenseType, DefenseVerdict } from '@prisma/client'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'

// Shared grid template for the defense schedule table. Keep it here so the
// header (DefenseTable) and every row use exactly the same column widths.
export const DEFENSE_GRID_COLS =
  'grid-cols-[2fr_1.3fr_1.2fr_1fr_1.2fr_1.3fr_1.1fr_120px]'

const TYPE_META: Record<DefenseType, { label: string; dotClass: string }> = {
  PROPOSAL: { label: 'Proposal Defense', dotClass: 'bg-[#a855f7]' },
  FINAL: { label: 'Final Defense', dotClass: 'bg-[#FE6F6F]' },
}

const VERDICT_META: Record<
  DefenseVerdict,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'No Verdict',
    className: '',
  },
  APPROVED: {
    label: 'Approved',
    className:
      'bg-[rgba(22,163,74,0.07)] border border-[rgba(22,163,74,0.2)] text-[#16a34a]',
  },
  MINOR_REVISION: {
    label: 'Minor Revision',
    className:
      'bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  },
  MAJOR_REVISION: {
    label: 'Major Revision',
    className:
      'bg-[rgba(225,104,29,0.07)] border border-[rgba(225,104,29,0.2)] text-[#e1681d]',
  },
  REJECTED: {
    label: 'Rejected',
    className:
      'bg-[rgba(225,29,72,0.07)] border border-[rgba(225,29,72,0.2)] text-[#e11d48]',
  },
}

// Schedules store a date-only value at UTC midnight, so the display formats
// it in UTC too — otherwise the day can shift in negative-offset timezones.
function formatDefenseDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Normalizes the wizard's time strings ("09:00", "9:00 AM", "9 AM") into the
// "9:00 AM" display format.
function formatTime12hr(value: string): string {
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

// Quiet icon buttons, matching the table row action styling used elsewhere.
const actionButtonClass =
  'flex items-center justify-center size-[30px] rounded-md border border-[#e8ebf8] bg-white text-[#5a6382] hover:bg-[rgba(112,125,255,0.08)] transition-colors'

interface DefenseDataRowProps {
  schedule: DefenseSchedulePayload
  currentUserId: number
  onView: (schedule: DefenseSchedulePayload) => void
  onDelete: (schedule: DefenseSchedulePayload) => void
}

export function DefenseDataRow({
  schedule,
  currentUserId,
  onView,
  onDelete,
}: DefenseDataRowProps) {
  // Namespace-safe comparison: session ids can arrive as strings, payload
  // ids are numbers, so coerce both sides before checking ownership.
  const isOwner = Number(schedule.createdById) === Number(currentUserId)
  const typeMeta = TYPE_META[schedule.type]
  const verdictMeta = VERDICT_META[schedule.verdict]

  return (
    <div
      className={`grid ${DEFENSE_GRID_COLS} items-center px-[20px] h-[60px] border-b border-[#f0f2fa] last:border-b-0 hover:bg-slate-50/40 transition-colors`}
    >
      <div className="min-w-0 pr-4">
        <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
          {schedule.groupName}
        </span>
      </div>

      <div className="min-w-0 pr-4">
        <span className="block truncate font-sans font-medium text-[13px] leading-[19.5px] text-[#8a93b4]">
          {schedule.sectionName}
        </span>
      </div>

      <div className="min-w-0 pr-4">
        <span className="flex items-center gap-[7px]">
          <span
            className={`size-[7px] rounded-full ${typeMeta.dotClass} shrink-0`}
          />
          <span className="truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
            {typeMeta.label}
          </span>
        </span>
      </div>

      <div className="pr-4">
        <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          {formatDefenseDate(schedule.date)}
        </span>
      </div>

      <div className="pr-4">
        <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#6b7399]">
          {formatTime12hr(schedule.startTime)} – {formatTime12hr(schedule.endTime)}
        </span>
      </div>

      <div className="min-w-0 pr-4">
        <span className="block truncate font-sans font-medium text-[12.5px] leading-[18.75px] text-[#5a6382]">
          {schedule.venue}
        </span>
      </div>

      <div className="pr-4">
        {schedule.verdict === 'PENDING' ? (
          <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
            {verdictMeta.label}
          </span>
        ) : (
          <span
            className={`inline-flex items-center h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] leading-[15.75px] whitespace-nowrap border ${verdictMeta.className}`}
          >
            {verdictMeta.label}
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-[6px]">
        <button
          type="button"
          title="View Details"
          aria-label={`View details for ${schedule.groupName}`}
          onClick={() => onView(schedule)}
          className={actionButtonClass}
        >
          <Eye className="size-[16px]" strokeWidth={2} />
        </button>
        {isOwner && (
          <button
            type="button"
            title="Delete"
            aria-label={`Delete defense for ${schedule.groupName}`}
            onClick={() => onDelete(schedule)}
            className={actionButtonClass}
          >
            <Trash2 className="size-[16px]" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}
