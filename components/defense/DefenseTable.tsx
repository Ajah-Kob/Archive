'use client'

import { Calendar } from 'lucide-react'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'
import { DefenseDataRow, DEFENSE_GRID_COLS } from './DefenseDataRow'
import DefenseToolbar from './DefenseToolbar'
import type { SectionOption } from './DefenseToolbar'
import { EmptyState } from './EmptyState'

const HEADER_LABELS = [
  'Group',
  'Section',
  'Type',
  'Date',
  'Time',
  'Venue',
  'Verdict',
  'Action',
]

interface DefenseTableProps {
  schedules: DefenseSchedulePayload[]
  currentUserId: number
  onView: (schedule: DefenseSchedulePayload) => void
  onEdit: (schedule: DefenseSchedulePayload) => void
  onDelete: (schedule: DefenseSchedulePayload) => void
  // Toolbar props — the toolbar lives inside the table card, above the headers.
  search: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  sectionFilter: string
  onSectionFilterChange: (value: string) => void
  mySchedules: boolean
  onMySchedulesChange: (value: boolean) => void
  sections: SectionOption[]
  onNew: () => void
  /** Whether any schedules exist at all (before filtering) — drives the empty message. */
  hasAnySchedules: boolean
}

export function DefenseTable({
  schedules,
  currentUserId,
  onView,
  onEdit,
  onDelete,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  sectionFilter,
  onSectionFilterChange,
  mySchedules,
  onMySchedulesChange,
  sections,
  onNew,
  hasAnySchedules,
}: DefenseTableProps) {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0">
      <DefenseToolbar
        search={search}
        onSearchChange={onSearchChange}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        sectionFilter={sectionFilter}
        onSectionFilterChange={onSectionFilterChange}
        mySchedules={mySchedules}
        onMySchedulesChange={onMySchedulesChange}
        sections={sections}
        onNew={onNew}
      />
      <div className="overflow-x-auto flex-1 min-h-0">
        {/* Inner min width keeps the 8 columns readable on small screens. */}
        <div className="min-w-[960px] flex flex-col min-h-full">
          <div
            className={`grid ${DEFENSE_GRID_COLS} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa]`}
          >
            {HEADER_LABELS.map((label) => (
              <span
                key={label}
                className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase"
              >
                {label}
              </span>
            ))}
          </div>

          {schedules.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={
                hasAnySchedules
                  ? 'No matching schedules'
                  : 'No defense schedules yet'
              }
              description={
                hasAnySchedules
                  ? 'No defense schedules match your search or filters. Try clearing them, or create a new schedule.'
                  : 'Create your first defense schedule for a capstone group — proposal or final defense — with venue, time, and panelists.'
              }
            />
          ) : (
            schedules.map((schedule) => (
              <DefenseDataRow
                key={schedule.id}
                schedule={schedule}
                currentUserId={currentUserId}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
