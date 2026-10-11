'use client'

import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { AppDateRangePicker } from '@/components/ui/AppDateRangePicker'

interface AuditFiltersProps {
  actor: string
  onActorChange: (value: string) => void
  start: Date | null
  end: Date | null
  onStartChange: (value: Date | null) => void
  onEndChange: (value: Date | null) => void
}

export function AuditFilters({
  actor,
  onActorChange,
  start,
  end,
  onStartChange,
  onEndChange,
}: AuditFiltersProps) {
  return (
    <HeaderBar>
      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        <div className="w-full sm:w-[280px] sm:shrink-0 sm:py-[8px]">
          <SearchBar
            value={actor}
            onChange={onActorChange}
            placeholder="Search actor (name or email)..."
            ariaLabel="Search actor"
            clearable
          />
        </div>
        <div className="w-full sm:w-[320px] sm:shrink-0 sm:py-[8px]">
          <AppDateRangePicker
            start={start}
            end={end}
            onStartChange={onStartChange}
            onEndChange={onEndChange}
          />
        </div>
      </div>
    </HeaderBar>
  )
}

export default AuditFilters
