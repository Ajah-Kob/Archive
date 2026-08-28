'use client'

import { Filter } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'

const ROLES = ['SUPERADMIN', 'ADMIN', 'FACULTY', 'STUDENT', 'GUEST']
const PER_PAGE_OPTIONS = [10, 25, 50]

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

export default function UsersToolbar({
  filters,
  onFilterChange,
}: UsersToolbarProps) {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] py-[20px] px-[20px] flex flex-col sm:flex-row items-center gap-[15px]">
      <div className="flex-1 w-full">
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

      <div className="relative w-full sm:w-auto">
        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <select
          value={filters.roleFilter}
          onChange={(e) =>
            onFilterChange((prev) => ({
              ...prev,
              roleFilter: e.target.value,
            }))
          }
          className="pl-9 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer min-w-[150px]"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e) =>
          onFilterChange((prev) => ({
            ...prev,
            dateFrom: e.target.value,
          }))
        }
        className="px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm min-w-[140px]"
      />

      <input
        type="date"
        value={filters.dateTo}
        onChange={(e) =>
          onFilterChange((prev) => ({
            ...prev,
            dateTo: e.target.value,
          }))
        }
        className="px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm min-w-[140px]"
      />

      <select
        value={filters.perPage}
        onChange={(e) =>
          onFilterChange((prev) => ({
            ...prev,
            perPage: Number(e.target.value),
          }))
        }
        className="px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
      >
        {PER_PAGE_OPTIONS.map((n) => (
          <option key={n} value={n}>{n} / page</option>
        ))}
      </select>
    </div>
  )
}
