'use client'

import { SearchBar } from '@/components/ui/SearchBar'
import { Filter } from '@/components/ui/Filter'
import { AppDateRangePicker } from '@/components/ui/AppDateRangePicker'

const ROLES = ['SUPERADMIN', 'ADMIN', 'FACULTY', 'STUDENT', 'GUEST']

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  ...ROLES.map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() })),
]

export interface FiltersState {
  searchTerm: string
  roleFilter: string
  dateFrom: string
  dateTo: string
  perPage: number
}

interface UsersToolbarProps {
  filters: FiltersState
  onFilterChange: React.Dispatch<React.SetStateAction<FiltersState>>
}

function toDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function toKey(date: Date | null): string {
  if (!date) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function UsersToolbar({
  filters,
  onFilterChange,
}: UsersToolbarProps) {
  return (
    <>
      <div className="w-[240px] sm:w-[320px] shrink-0">
        <SearchBar
          value={filters.searchTerm}
          onChange={(value) =>
            onFilterChange((prev) => ({
              ...prev,
              searchTerm: value,
            }))
          }
          placeholder="Search users..."
        />
      </div>

      <Filter
        value={filters.roleFilter}
        options={ROLE_OPTIONS}
        onChange={(value) =>
          onFilterChange((prev) => ({
            ...prev,
            roleFilter: value,
          }))
        }
        ariaLabel="Filter by role"
      />

      <div className="w-[280px] sm:w-[320px] shrink-0">
        <AppDateRangePicker
          start={toDate(filters.dateFrom)}
          end={toDate(filters.dateTo)}
          onStartChange={(value) =>
            onFilterChange((prev) => ({
              ...prev,
              dateFrom: toKey(value),
            }))
          }
          onEndChange={(value) =>
            onFilterChange((prev) => ({
              ...prev,
              dateTo: toKey(value),
            }))
          }
        />
      </div>
    </>
  )
}
