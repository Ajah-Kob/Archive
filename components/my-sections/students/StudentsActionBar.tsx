'use client'

import { Trash2 } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'

interface StudentsActionBarProps {
  search: string
  onSearchChange: (value: string) => void
  filter: string
  onFilterChange: (value: string) => void
  filterOptions: FilterOption[]
  selectedCount: number
  onDeleteClick: () => void
}

export function StudentsActionBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  filterOptions,
  selectedCount,
  onDeleteClick,
}: StudentsActionBarProps) {
  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[10px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder="Search students…"
          ariaLabel="Search students"
          className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
        />
        <Filter
          value={filter}
          options={filterOptions}
          onChange={onFilterChange}
          ariaLabel="Filter by group"
        />
      </div>

      {selectedCount > 0 && (
        <button
          type="button"
          onClick={onDeleteClick}
          className="flex gap-[6px] items-center h-[37.5px] px-[14px] rounded-lg bg-white border border-red-200 font-sans font-bold text-[13px] leading-none text-[#ef4444] hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 className="size-[14px]" />
          Delete ({selectedCount})
        </button>
      )}
    </div>
  )
}
