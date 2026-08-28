'use client'

import { Plus } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'

/** A section available for the section filter, from the coordinator's sections. */
export interface SectionOption {
  id: number
  name: string
}

interface DefenseToolbarProps {
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
  /** Sections the coordinator owns; rendered as Section filter options. */
  sections: SectionOption[]
  onNew: () => void
}

const TYPE_OPTIONS: ReadonlyArray<FilterOption> = [
  { value: '', label: 'All Types' },
  { value: 'PROPOSAL', label: 'Proposal Defense' },
  { value: 'FINAL', label: 'Final Defense' },
]

const STATUS_OPTIONS: ReadonlyArray<FilterOption> = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'No Verdict' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'MINOR_REVISION', label: 'Minor Revisions' },
  { value: 'MAJOR_REVISION', label: 'Major Revisions' },
  { value: 'REJECTED', label: 'Rejected' },
]

/**
 * Toolbar for the defense scheduling page. Fully controlled: every filter,
 * the search term, and the "My Schedules" toggle are value + onChange props,
 * so the parent page owns all state (server data lives there, not here).
 */
export default function DefenseToolbar({
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
}: DefenseToolbarProps) {
  const sectionOptions: FilterOption[] = [
    { value: '', label: 'All Sections' },
    ...sections.map((s) => ({ value: String(s.id), label: s.name })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-5 py-[12px] border-b border-[#f0f2fa] shrink-0">
      <button
        type="button"
        role="switch"
        aria-checked={mySchedules}
        onClick={() => onMySchedulesChange(!mySchedules)}
        className="flex items-center gap-2 h-[37.5px] px-[13px] bg-white border border-[#e8ebf8] rounded-lg hover:border-[rgba(112,125,255,0.6)] transition-colors shrink-0"
      >
        <span className="font-sans font-semibold text-[13px] text-[#5a6382] whitespace-nowrap">
          All
        </span>
        <span
          className={`relative w-[32px] h-[18px] rounded-full transition-colors ${
            mySchedules ? 'bg-[#707dff]' : 'bg-[#dddff0]'
          }`}
        >
          <span
            className={`absolute top-[2.5px] left-[2.5px] size-[13px] bg-white rounded-full shadow-sm transition-transform ${
              mySchedules ? 'translate-x-[14px]' : ''
            }`}
          />
        </span>
      </button>

      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder="Search schedules..."
        ariaLabel="Search defense schedules"
        className="flex-1 min-w-[200px] max-w-[320px]"
      />

      <Filter
        value={typeFilter}
        options={TYPE_OPTIONS}
        onChange={onTypeFilterChange}
        ariaLabel="Filter by defense type"
      />
      <Filter
        value={statusFilter}
        options={STATUS_OPTIONS}
        onChange={onStatusFilterChange}
        ariaLabel="Filter by status"
      />
      <Filter
        value={sectionFilter}
        options={sectionOptions}
        onChange={onSectionFilterChange}
        ariaLabel="Filter by section"
      />

      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] text-white rounded-lg font-sans font-semibold text-[13px] shadow-[0px_2px_5px_rgba(112,125,255,0.25)] hover:bg-[#5565ff] active:scale-[0.98] transition-all shrink-0 ml-auto"
      >
        <Plus className="size-4" strokeWidth={2} />
        <span className="whitespace-nowrap">New Defense Schedule</span>
      </button>
    </div>
  )
}
