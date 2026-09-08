'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { SectionCard } from './SectionCard'
import { SectionModal } from './SectionModal'
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

export function MySectionsPage({ initialSections }: MySectionsPageProps) {
  const router = useRouter()
  const version = useSectionsRefresh((s) => s.version)
  const bump = useSectionsRefresh((s) => s.bump)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

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

  function handleCreateSuccess() {
    setCreateOpen(false)
    bump()
    router.refresh()
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <HeaderBar
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-[32px] px-[14px] rounded-[8px] font-sans font-bold text-[13px] leading-[19.5px] text-white shrink-0 hover:opacity-90 active:scale-[0.98] transition-all"
            style={{
              backgroundImage:
                'linear-gradient(163.7deg, rgb(112,125,255) 0%, rgb(85,101,255) 100%)',
              boxShadow: '0px 2px 6px rgba(112,125,255,0.25)',
            }}
          >
            <Plus className="size-[14px]" strokeWidth={2.5} />
            Create Section
          </button>
        }
      >
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
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white border border-dashed border-[#e8ebf8] rounded-[12px]">
            <p className="font-sans font-semibold text-[13px] text-[#8a93b4] text-center">
              {search || phaseFilter !== 'all'
                ? `No sections match your search or filter.`
                : 'No sections yet. Create your first class.'}
            </p>
            {!search && phaseFilter === 'all' && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 h-[36px] px-4 rounded-[10px] bg-[#f4f5fc] border border-[#e0e3f0] font-sans font-bold text-[13px] text-[#707dff] hover:bg-[#eef0ff] transition-colors"
              >
                <Plus className="size-[14px]" />
                Create Section
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <SectionCard key={s.id} section={s} />
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <SectionModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}
