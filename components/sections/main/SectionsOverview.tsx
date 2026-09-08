'use client'

import { useEffect, useMemo, useState } from 'react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { ManageCoordinatorsButton } from '@/components/sections/main/ManageCoordinatorsButton'
import { SectionTable } from '@/components/sections/main/SectionTable'
import { getSections } from '@/lib/actions/sections'
import type { SectionData } from '@/components/sections/main/SectionDataRow'

type PhaseFilter = 'all' | 'CAPSTONE_1' | 'CAPSTONE_2'

const PHASE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Phases' },
  { value: 'CAPSTONE_1', label: 'Capstone 1' },
  { value: 'CAPSTONE_2', label: 'Capstone 2' },
]

export default function SectionsOverview() {
  const [sections, setSections] = useState<SectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')

  useEffect(() => {
    getSections().then((res) => {
      if (res.success && res.payload) setSections(res.payload)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sections.filter((s) => {
      if (phaseFilter !== 'all' && s.capstonePhase !== phaseFilter) return false
      if (!term) return true
      return s.section.toLowerCase().includes(term) || s.coordinator.name.toLowerCase().includes(term) || s.coordinator.email.toLowerCase().includes(term)
    })
  }, [sections, search, phaseFilter])

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <HeaderBar actions={<ManageCoordinatorsButton primary />}>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-[37.5px] w-[320px] rounded-lg bg-[#dfe3fb] animate-pulse" />
            <div className="h-[37.5px] w-[140px] rounded-lg bg-[#dfe3fb] animate-pulse" />
          </div>
        </HeaderBar>
        <div className="flex-1 flex flex-col min-h-0 pt-[16px] px-8 pb-[30px]">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08)] flex-1 flex items-center justify-center">
            <p className="font-sans text-[13px] text-[#8a93b4]">Loading sections…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <HeaderBar actions={<ManageCoordinatorsButton primary />}>
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search section or coordinator…"
            ariaLabel="Search sections"
            className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
          />
          <Filter value={phaseFilter} options={PHASE_OPTIONS} onChange={(v) => setPhaseFilter(v as PhaseFilter)} ariaLabel="Filter by capstone phase" />
        </div>
      </HeaderBar>

      <div className="flex-1 flex flex-col min-h-0 pt-[16px] px-8 pb-[30px]">
        <SectionTable sections={filtered} />
      </div>
    </div>
  )
}
