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
    <div className="w-full flex flex-nowrap items-center justify-between gap-x-[16px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
      {/* Single line: search + filter scroll sideways rather than wrapping. */}
      <div className="flex items-center gap-2.5 min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder="Search students…"
          ariaLabel="Search students"
          className="w-[280px] sm:flex-[0_0_320px] sm:max-w-[320px] shrink-0"
        />
        <Filter
          value={filter}
          options={filterOptions}
          onChange={onFilterChange}
          ariaLabel="Filter by group"
        />
      </div>

      {/* Desktop only -- below sm the Delete control lives in the page container,
          directly above the student cards. */}
      {selectedCount > 0 && (
        <button
          type="button"
          onClick={onDeleteClick}
          className="hidden sm:flex gap-[6px] items-center h-[37.5px] px-[14px] rounded-lg bg-white border border-red-200 font-sans font-bold text-[13px] leading-none text-[#ef4444] hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 className="size-[14px]" />
          Delete ({selectedCount})
        </button>
      )}
    </div>
  )
}
