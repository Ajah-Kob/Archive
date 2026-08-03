'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'
import { StudentDataRow, type StudentData } from './StudentDataRow'

export type StudentSortKey = 'name' | 'activity'

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
      className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase"
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

interface StudentTableProps {
  students: StudentData[]
  emptyMessage?: string
  sortField?: StudentSortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: StudentSortKey) => void
}

export function StudentTable({
  students,
  emptyMessage = 'No students in this section yet.',
  sortField,
  sortDir,
  onSort,
}: StudentTableProps) {
  return (
    <div className="w-full">
      {/* Header Row */}
      <div className="grid grid-cols-[2fr_1fr_1fr] items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa]">
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
        <div className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase">
          Group
        </div>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-10 py-16 w-full">
          <h3 className="font-heading font-bold text-[14px] leading-[21px] text-[#3d4566] tracking-[-0.14px] text-center mb-1">
            No Students Found
          </h3>
          <p className="font-sans font-medium text-[12.5px] leading-[20px] text-[#8a93b4] text-center max-w-[340px]">
            {emptyMessage}
          </p>
        </div>
      ) : (
        students.map((student) => (
          <StudentDataRow key={student.id} data={student} />
        ))
      )}
    </div>
  )
}
