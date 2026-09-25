'use client'

import { useMemo, useState } from 'react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionCard } from './SectionCard'
import type { MySectionCardData } from '@/lib/actions/sections'
import { useSectionsRefresh } from '@/store/useSectionsRefresh'

const PHASE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Phases' },
  { value: 'CAPSTONE_1', label: 'Capstone 1' },
  { value: 'CAPSTONE_2', label: 'Capstone 2' },
]

interface MySectionsPageProps {
  initialSections: MySectionCardData[]
}

// Card-only coordinator scope: assigned sections only (unassigned rows never
// reach here via getCoordinatorSections). No Create Section button, no
// empty-state create CTA, no create modal, no table toggle, and no
// global-management controls. Card grid + search/phase filter only.
export function MySectionsPage({ initialSections }: MySectionsPageProps) {
  const version = useSectionsRefresh((s) => s.version)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')

  // Derive filtered list from props + search + phase; version busts memo on refresh
  const filtered = useMemo(() => {
    void version
    const q = search.trim().toLowerCase()
    return initialSections.filter((s) => {
      const phase = s.capstone2OpenedAt ? 'CAPSTONE_2' : 'CAPSTONE_1'
      if (phaseFilter !== 'all' && phase !== phaseFilter) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        (s.joinCode ?? '').toLowerCase().includes(q)
      )
    })
  }, [initialSections, search, phaseFilter, version])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <HeaderBar>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-[280px] shrink-0 py-[8px]">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search section..."
              ariaLabel="Search sections"
              clearable
            />
          </div>
          <Filter
            value={phaseFilter}
            options={PHASE_OPTIONS}
            onChange={setPhaseFilter}
            ariaLabel="Filter by capstone phase"
          />
        </div>
      </HeaderBar>

      <div className="flex-1 min-h-0 pt-[16px] px-8 flex flex-col">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden w-full">
            <EmptyState
              heading={search || phaseFilter !== 'all' ? 'No Matching Sections' : 'No Sections Assigned'}
              description={
                search || phaseFilter !== 'all'
                  ? 'No sections match your search or filter. Try adjusting your search or filter.'
                  : 'You have no assigned sections yet. Sections assigned to you will appear here.'
              }
              variant="card"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <SectionCard key={s.id} section={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
