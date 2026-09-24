'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'
import { DefenseDataRow, DEFENSE_GRID_COLS } from './DefenseDataRow'
import { EmptyState } from './EmptyState'

export type SortKey =
  | 'group'
  | 'section'
  | 'type'
  | 'datetime'
  | 'venue'
  | 'verdict'

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortKey
  label: string
  sortField?: SortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: SortKey) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSort?.(field)}
      aria-label={`Sort by ${label}`}
      className="flex items-center gap-1 cursor-pointer select-none font-sans font-bold text-[11px] leading-[16.5px] tracking-[0.88px] uppercase text-left transition-colors text-[#9ea8c6] hover:text-[#5a6382]"
    >
      {label}
      {sortField === field ? (
        sortDir === 'asc' ? (
          <ChevronUp size={12} />
        ) : (
          <ChevronDown size={12} />
        )
      ) : (
        <ChevronUp size={12} className="opacity-50" />
      )}
    </button>
  )
}

const HEADER_COLUMNS: ReadonlyArray<{ key: SortKey | null; label: string }> = [
  { key: 'group', label: 'Group' },
  { key: 'section', label: 'Section' },
  { key: 'type', label: 'Type' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'venue', label: 'Venue' },
  { key: 'verdict', label: 'Verdict' },
  { key: null, label: 'Action' },
]

interface DefenseTableProps {
  schedules: DefenseSchedulePayload[]
  currentUserId: number
  onView: (schedule: DefenseSchedulePayload) => void
  onDelete: (schedule: DefenseSchedulePayload) => void
  onReschedule: (schedule: DefenseSchedulePayload) => void
  /** Whether any schedules exist at all (before filtering) — drives the empty message. */
  hasAnySchedules: boolean
  sortField?: SortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: SortKey) => void
}

export function DefenseTable({
  schedules,
  currentUserId,
  onView,
  onDelete,
  onReschedule,
  hasAnySchedules,
  sortField,
  sortDir,
  onSort,
}: DefenseTableProps) {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="overflow-x-auto flex-1 min-h-0">
        {/* Inner min width keeps the 7 columns readable on small screens. */}
        <div className="min-w-[880px] flex flex-col min-h-full">
          <div
            className={`grid ${DEFENSE_GRID_COLS} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa] rounded-t-[14px]`}
          >
            {HEADER_COLUMNS.map((column) =>
              column.key ? (
                <SortHeader
                  key={column.label}
                  field={column.key}
                  label={column.label}
                  {...{ sortField, sortDir, onSort }}
                />
              ) : (
                <span
                  key={column.label}
                  className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase"
                >
                  {column.label}
                </span>
              ),
            )}
          </div>

          {schedules.length === 0 ? (
            <EmptyState
              heading={
                hasAnySchedules ? 'No Matching Schedules' : 'No Defense Schedules Yet'
              }
              description={
                hasAnySchedules
                  ? 'No defense schedules match your search or filters. Try clearing them, or create a new schedule.'
                  : 'Create your first defense schedule for a capstone group — proposal or final defense — with venue, time, and panelists.'
              }
              variant="table"
            />
          ) : (
            schedules.map((schedule) => (
              <DefenseDataRow
                key={schedule.id}
                schedule={schedule}
                currentUserId={currentUserId}
                onView={onView}
                onDelete={onDelete}
                onReschedule={onReschedule}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
