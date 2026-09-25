'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  SectionDataRow,
  type SectionData,
} from './SectionDataRow'

type SortKey =
  | 'section'
  | 'academicYear'
  | 'capstonePhase'
  | 'coordinator'
  | 'dateCreated'
  | 'students'
  | 'groups'

const GRID_COLS =
  'grid-cols-[1.4fr_1fr_0.9fr_1.5fr_1fr_0.7fr_0.7fr_120px]'

function coordinatorSortValue(section: SectionData): string {
  if (section.coordinator) return section.coordinator.name
  return section.coordinatorId === null ? 'Unassigned' : 'Unavailable'
}

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
  const active = sortField === field
  const directionLabel = active ? (sortDir === 'asc' ? ', sorted ascending' : ', sorted descending') : ''

  return (
    <button
      type="button"
      onClick={() => onSort?.(field)}
      aria-label={`Sort by ${label}${directionLabel}`}
      className="flex items-center gap-1 font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase hover:text-[#707dff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#707dff] transition-colors text-left"
    >
      {label}
      {active ? (
        sortDir === 'asc' ? (
          <ChevronUp size={12} aria-hidden="true" />
        ) : (
          <ChevronDown size={12} aria-hidden="true" />
        )
      ) : (
        <ChevronUp size={12} aria-hidden="true" className="opacity-50" />
      )}
    </button>
  )
}

interface SectionTableProps {
  sections: SectionData[]
  renderActions?: (section: SectionData) => ReactNode
  onAssign?: (section: SectionData) => void
}

export function SectionTable({ sections, renderActions, onAssign }: SectionTableProps) {
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
      if (sortField === 'coordinator') {
        cmp = coordinatorSortValue(a).localeCompare(coordinatorSortValue(b))
      } else if (sortField === 'section') {
        cmp = a.section.localeCompare(b.section)
      } else if (sortField === 'academicYear') {
        cmp = a.academicYear.localeCompare(b.academicYear)
      } else if (sortField === 'capstonePhase') {
        cmp = a.capstonePhase.localeCompare(b.capstonePhase)
      } else if (sortField === 'dateCreated') {
        cmp = a.dateCreated.localeCompare(b.dateCreated)
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
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <div role="status" aria-live="polite" className="flex-1 flex flex-col min-h-0">
          <EmptyState
            heading="No Sections Created"
            description="No sections have been created yet. Use Create Section to add the first section."
            variant="table"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="overflow-x-auto flex-1 flex flex-col min-h-0">
        <div role="table" aria-label="Sections" className="min-w-[960px] flex-1 flex flex-col min-h-0">
          {/* Header Row — Section, Academic Year, Phase, Coordinator, Date Created, Students, Groups, Actions */}
          <div role="row" className={`grid ${GRID_COLS} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa] rounded-t-[14px] shrink-0`}>
            <div role="columnheader">
              <SortHeader
                field="section"
                label="Section"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
            <div role="columnheader">
              <SortHeader
                field="academicYear"
                label="Academic Year"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
            <div role="columnheader">
              <SortHeader
                field="capstonePhase"
                label="Phase"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
            <div role="columnheader">
              <SortHeader
                field="coordinator"
                label="Coordinator"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
            <div role="columnheader">
              <SortHeader
                field="dateCreated"
                label="Date Created"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
            <div role="columnheader">
              <SortHeader
                field="students"
                label="Students"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
            <div role="columnheader">
              <SortHeader
                field="groups"
                label="Groups"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </div>
            <div role="columnheader" aria-label="Actions">
              <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
                Actions
              </span>
            </div>
          </div>

          {/* Section Rows — stable keys, no View Details, no card toggle */}
          {sorted.map((item) => (
            <SectionDataRow
              key={item.id}
              data={item}
              actions={renderActions?.(item)}
              onAssign={onAssign}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
