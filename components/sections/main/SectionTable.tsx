'use client'

import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { NoSectionIcon } from '@/assets/NoSectionIcon'
import { TableListHeader } from './TableListHeader'
import { SectionDataRow, type SectionData } from './SectionDataRow'

type SortKey = 'section' | 'students' | 'groups'

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

interface SectionTableProps {
  sections: SectionData[]
}

export function SectionTable({ sections }: SectionTableProps) {
  const [sortField, setSortField] = useState<SortKey>('section')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: SortKey) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir(field === 'section' ? 'asc' : 'desc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  const sorted = useMemo(() => {
    const rows = [...sections]
    rows.sort((a, b) => {
      let cmp = 0
      if (sortField === 'section') {
        cmp = a.section.localeCompare(b.section)
      } else if (sortField === 'students') {
        cmp = a.students - b.students
      } else {
        cmp = a.groups - b.groups
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [sections, sortField, sortDir])

  if (sections.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0">
        <TableListHeader title="Sections" />
        <div className="flex flex-col items-center justify-center px-10 py-16 w-full">
          <div className="mb-5">
            <NoSectionIcon />
          </div>
          <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] text-center mb-2">
            No Sections Created
          </h3>
          <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
            No sections have been created by coordinators yet. Sections will
            appear here once coordinators start setting up their classes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0">
      {/* Table Header */}
      <TableListHeader title="Sections" />

      {/* Header Row */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_150px] items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa]">
        <div className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase">
          Coordinator
        </div>
        <SortHeader
          field="section"
          label="Section"
          {...{ sortField, sortDir, onSort: handleSort }}
        />
        <div className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase">
          Date Created
        </div>
        <SortHeader
          field="students"
          label="Students"
          {...{ sortField, sortDir, onSort: handleSort }}
        />
        <SortHeader
          field="groups"
          label="Groups"
          {...{ sortField, sortDir, onSort: handleSort }}
        />
        <div />
      </div>

      {/* Section Rows */}
      {sorted.map((item) => (
        <SectionDataRow key={item.id} data={item} />
      ))}
    </div>
  )
}
