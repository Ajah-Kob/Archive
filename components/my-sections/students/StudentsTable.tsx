'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'
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
        <div className="flex flex-col items-center justify-center px-10 py-16 w-full flex-1">
          <h3 className="font-heading font-bold text-[14px] leading-[21px] text-[#3d4566] tracking-[-0.14px] text-center mb-1">
            No Students Found
          </h3>
          <p className="font-sans font-medium text-[12.5px] leading-[20px] text-[#8a93b4] text-center max-w-[340px]">
            {emptyMessage}
          </p>
        </div>
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
  )
}
