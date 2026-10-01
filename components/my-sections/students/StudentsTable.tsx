'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActivityStatus } from '@/components/ui/ActivityStatus'
import { StudentDataRow, type StudentData } from './StudentDataRow'

export type StudentSortKey = 'name' | 'activity' | 'group'

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: StudentSortKey
  label: string
  sortField?: StudentSortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: StudentSortKey) => void
}) {
  return (
    <div
      className="flex items-center gap-1 cursor-pointer select-none font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase"
      onClick={() => onSort?.(field)}
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
    </div>
  )
}

interface StudentsTableProps {
  students: StudentData[]
  emptyMessage?: string
  sortField?: StudentSortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: StudentSortKey) => void
  selectedIds: Set<number>
  onToggle: (id: number) => void
  onToggleAll: () => void
}

export function StudentsTable({
  students,
  emptyMessage = 'No students in this section yet.',
  sortField,
  sortDir,
  onSort,
  selectedIds,
  onToggle,
  onToggleAll,
}: StudentsTableProps) {
  const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id))
  const someSelected = students.some((s) => selectedIds.has(s.id))

  return (
    <div className="w-full flex flex-col flex-1 min-h-full">
      {/* Mobile: one card per student inside a white panel, matching the desktop
          chrome so the page does not change surface at the breakpoint. Every
          column is readable without a sideways swipe. */}
      <div className="sm:hidden flex-1 min-h-0 overflow-y-auto">
        <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] p-3 flex flex-col gap-[10px]">
        {students.length === 0 ? (
          <EmptyState heading="No Students Found" description={emptyMessage} variant="table" />
        ) : (
          students.map((student) => (
            <div
              key={student.id}
              className={`flex items-start gap-[12px] rounded-[12px] border bg-white px-[12px] py-[12px] ${
                selectedIds.has(student.id) ? 'border-[#c9cfff]' : 'border-[#eceef8]'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(student.id)}
                onChange={() => onToggle(student.id)}
                aria-label={`Select ${student.name}`}
                className="size-4 mt-1 rounded border-[#dddff0] accent-[#707dff] cursor-pointer shrink-0"
              />

              <div className="min-w-0 flex-1 flex flex-col gap-[8px]">
                <UserProfile
                  initials={student.initials}
                  name={student.name}
                  email={student.email}
                  gradient={student.avatarGradient}
                />

                <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px]">
                  <ActivityStatus status={student.activityStatus} />
                  <span className="text-[#c4cadf] text-[12px]">·</span>
                  {student.group ? (
                    <span className="truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                      {student.group.name}
                    </span>
                  ) : (
                    <span className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">
                      No group
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>

      {/* Desktop: the original grid table, still on its white card. */}
      <div className="hidden sm:flex flex-col flex-1 min-h-full bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-[32px_2fr_1fr_1fr] items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa] rounded-t-[14px]">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allSelected && someSelected
              }}
              onChange={onToggleAll}
              aria-label="Select all visible students"
              className="size-4 rounded border-[#dddff0] accent-[#707dff] cursor-pointer"
            />
          </div>
          <SortHeader
            field="name"
            label="Student"
            {...{ sortField, sortDir, onSort }}
          />
          <SortHeader
            field="activity"
            label="Activity"
            {...{ sortField, sortDir, onSort }}
          />
          <SortHeader
            field="group"
            label="Group"
            {...{ sortField, sortDir, onSort }}
          />
        </div>

        {students.length === 0 ? (
          <EmptyState heading="No Students Found" description={emptyMessage} variant="table" />
        ) : (
          students.map((student) => (
            <StudentDataRow
              key={student.id}
              data={student}
              selected={selectedIds.has(student.id)}
              onToggle={() => onToggle(student.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
