'use client'

import { CalendarClock, Eye, Trash2 } from 'lucide-react'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'
import {
  actionButtonClass,
  formatDefenseDate,
  formatTime12hr,
  TYPE_META,
  VERDICT_META,
} from './DefenseDataRow'

/**
 * Mobile counterpart to DefenseDataRow — one card per schedule, below `sm`.
 *
 * The table is a seven-column grid at `min-w-[880px]`, so on a phone it was a
 * horizontal scroll to read a row at all. This stacks the same six fields
 * vertically in reading order: what kind of defense it is and its verdict, then
 * who it belongs to, then where and when. The row actions keep their own gated
 * set — Reschedule only for the owner on a REDEFENSE, Delete only for the owner —
 * so the card never offers an action the row would have hidden.
 *
 * Date, time, type and verdict formatting are imported from DefenseDataRow
 * rather than repeated, so the two renderings cannot drift.
 */
export function DefenseCard({
  schedule,
  currentUserId,
  onView,
  onDelete,
  onReschedule,
}: {
  schedule: DefenseSchedulePayload
  currentUserId: number
  onView: (schedule: DefenseSchedulePayload) => void
  onDelete: (schedule: DefenseSchedulePayload) => void
  onReschedule: (schedule: DefenseSchedulePayload) => void
}) {
  // Namespace-safe comparison, matching DefenseDataRow: session ids can arrive as
  // strings, payload ids are numbers.
  const isOwner = Number(schedule.createdById) === Number(currentUserId)
  const typeMeta = TYPE_META[schedule.type]
  const verdictMeta = VERDICT_META[schedule.verdict]

  return (
    <div className="flex flex-col gap-[8px] mb-[10px] last:mb-0 rounded-[12px] border border-[#eceef8] bg-white px-[12px] py-[12px]">
      {/* Defense type, with the verdict opposite it. */}
      <div className="flex items-center justify-between gap-[10px]">
        <span className="flex items-center gap-[7px] min-w-0">
          <span className={`size-[7px] rounded-full ${typeMeta.dotClass} shrink-0`} />
          <span className="truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
            {typeMeta.label}
          </span>
        </span>

        {schedule.verdict === 'PENDING' ? (
          <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
            {verdictMeta.label}
          </span>
        ) : (
          <span
            className={`inline-flex items-center h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] leading-[15.75px] whitespace-nowrap border shrink-0 ${verdictMeta.className}`}
          >
            {verdictMeta.label}
          </span>
        )}
      </div>

      <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
        {schedule.groupName}
      </span>

      <span className="block truncate font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
        {schedule.sectionName} &middot; {schedule.venue}
      </span>

      <span className="block font-sans font-medium text-[12.5px] leading-[18.75px] text-[#5a6382]">
        {formatDefenseDate(schedule.date)} &middot; {formatTime12hr(schedule.startTime)} –{' '}
        {formatTime12hr(schedule.endTime)}
      </span>

      <div className="flex items-center justify-end gap-[6px] border-t border-[#f0f2fa] pt-[10px] mt-[2px]">
        <button
          type="button"
          title="View Details"
          aria-label={`View details for ${schedule.groupName}`}
          onClick={() => onView(schedule)}
          className={actionButtonClass}
        >
          <Eye className="size-[16px]" strokeWidth={2} />
        </button>
        {isOwner && schedule.verdict === 'REDEFENSE' && (
          <button
            type="button"
            title="Reschedule for Redefense"
            aria-label={`Reschedule redefense for ${schedule.groupName}`}
            onClick={() => onReschedule(schedule)}
            className={actionButtonClass}
          >
            <CalendarClock className="size-[16px]" strokeWidth={2} />
          </button>
        )}
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