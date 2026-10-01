'use client'

import { SearchBar } from '@/components/ui/SearchBar'
import { ScrollFadeRegion } from '@/components/ui/ScrollFadeRegion'
import { Filter, type FilterOption } from '@/components/ui/Filter'

interface StudentsActionBarProps {
  search: string
  onSearchChange: (value: string) => void
  filter: string
  onFilterChange: (value: string) => void
  filterOptions: FilterOption[]
}

export function StudentsActionBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  filterOptions,
}: StudentsActionBarProps) {
  return (
    <div className="w-full flex flex-nowrap items-center justify-between gap-x-[16px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
      {/* Single line: search + filter scroll sideways rather than wrapping. */}
      <ScrollFadeRegion className="flex items-center gap-2.5 flex-1">
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
      </ScrollFadeRegion>
    </div>
  )
}
