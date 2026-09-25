'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { SectionTable } from '@/components/sections/main/SectionTable'
import { SectionTableSkeleton } from '@/components/sections/main/SectionTableSkeleton'
import { SectionModal } from '@/components/my-sections/SectionModal'
import { ArchiveSectionModal } from '@/components/my-sections/ArchiveSectionModal'
import { AssignCoordinatorModal } from '@/components/sections/main/AssignCoordinatorModal'
import { getSections } from '@/lib/actions/sections'
import { useSectionsRefresh } from '@/store/useSectionsRefresh'
import {
  UNASSIGNED_COORDINATOR_LABEL,
  type SectionData,
} from '@/components/sections/main/SectionDataRow'

type PhaseFilter = 'all' | 'CAPSTONE_1' | 'CAPSTONE_2'

type CoordinatorActionState =
  | { mode: 'assign'; section: SectionData }
  | { mode: 'edit'; section: SectionData; currentCoordinatorId: number }

function CoordinatorActionModal({
  action,
  onClose,
  onSuccess,
}: {
  action: CoordinatorActionState
  onClose: () => void
  onSuccess: () => void
}) {
  const section = {
    id: action.section.id,
    name: action.section.section,
    academicYear: action.section.academicYear,
  }

  if (action.mode === 'assign') {
    return (
      <AssignCoordinatorModal
        mode="assign"
        section={section}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    )
  }

  return (
    <AssignCoordinatorModal
      mode="edit"
      currentCoordinatorId={action.currentCoordinatorId}
      section={section}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}

const PHASE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Phases' },
  { value: 'CAPSTONE_1', label: 'Capstone 1' },
  { value: 'CAPSTONE_2', label: 'Capstone 2' },
]

interface SectionsOverviewProps {
  renderActions?: (section: SectionData) => ReactNode
  onAssign?: (section: SectionData) => void
}

// Table-only global management surface for Admin/Program Chair: search +
// Phase-only filter, Create Section in HeaderBar's right action area,
// per-row manager actions (Edit opens the global-edit modal, the coordinator
// action opens assign/reassign, and Archive opens the neutral confirmation
// modal). No
// card/table toggle, no academic-year/unassigned filters, no View Details, no
// global details route. renderActions/onAssign remain as optional overrides; by
// default the surface wires its own manager-only mutations and refresh. My
// Sections inherits nothing from here.
export default function SectionsOverview({ renderActions, onAssign }: SectionsOverviewProps) {
  const [sections, setSections] = useState<SectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<SectionData | null>(null)
  const [coordinatorAction, setCoordinatorAction] =
    useState<CoordinatorActionState | null>(null)
  const [archiving, setArchiving] = useState<SectionData | null>(null)

  const fetchSections = useCallback(async () => {
    const res = await getSections()
    return res.success && res.payload ? res.payload : null
  }, [])

  const loadSections = useCallback(async () => {
    const payload = await fetchSections()
    if (payload) setSections(payload)
    setLoading(false)
  }, [fetchSections])

  useEffect(() => {
    let cancelled = false
    fetchSections()
      .then((payload) => {
        if (cancelled) return
        if (payload) setSections(payload)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchSections])

  // Mutation refresh contract: refetch the global list (new rows arrive
  // unassigned/purple, assigned rows show the current coordinator) and bump
  // the shared refresh version so coordinator-scoped surfaces stay in sync. The
  // server actions already revalidate the 'sections' cache tag; this refetch
  // is what pulls the fresh rows into this client-rendered table.
  const handleMutated = useCallback(() => {
    loadSections()
    useSectionsRefresh.getState().bump()
  }, [loadSections])

  const handleAssign = useCallback(
    (section: SectionData) => {
      if (onAssign) {
        onAssign(section)
        return
      }
      if (section.coordinatorId !== null) return
      setCoordinatorAction({ mode: 'assign', section })
    },
    [onAssign],
  )

  const handleCoordinatorAction = useCallback((section: SectionData) => {
    const nextAction: CoordinatorActionState =
      section.coordinatorId === null
        ? { mode: 'assign', section }
        : {
            mode: 'edit',
            section,
            currentCoordinatorId: section.coordinatorId,
          }
    setCoordinatorAction(nextAction)
  }, [])

  const handleRenderActions = useCallback(
    (section: SectionData) => {
      if (renderActions) return renderActions(section)
      const coordinatorLabel =
        section.coordinatorId === null
          ? 'Assign Coordinator'
          : 'Edit Coordinator'
      return (
        <ActionMenu
          items={[
            { label: 'Edit Section', onClick: () => setEditing(section) },
            {
              label: coordinatorLabel,
              onClick: () => handleCoordinatorAction(section),
            },
            {
              label: 'Archive Section',
              onClick: () => setArchiving(section),
            },
          ]}
        />
      )
    },
    [handleCoordinatorAction, renderActions],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sections.filter((s) => {
      if (phaseFilter !== 'all' && s.capstonePhase !== phaseFilter) return false
      if (!term) return true
      const coordinatorName = s.coordinator?.name ?? ''
      const coordinatorEmail = s.coordinator?.email ?? ''
      const unassignedText =
        s.coordinatorId === null ? UNASSIGNED_COORDINATOR_LABEL : ''
      return (
        s.section.toLowerCase().includes(term) ||
        coordinatorName.toLowerCase().includes(term) ||
        coordinatorEmail.toLowerCase().includes(term) ||
        s.academicYear.toLowerCase().includes(term) ||
        unassignedText.toLowerCase().includes(term)
      )
    })
  }, [sections, search, phaseFilter])

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <HeaderBar
          actions={
            <div className="h-[32px] w-[140px] rounded-[8px] bg-[#dfe3fb] animate-pulse" />
          }
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-[37.5px] w-[320px] rounded-lg bg-[#dfe3fb] animate-pulse" />
            <div className="h-[37.5px] w-[140px] rounded-lg bg-[#dfe3fb] animate-pulse" />
          </div>
        </HeaderBar>
        <div
          role="status"
          aria-live="polite"
          aria-label="Loading sections"
          className="flex-1 flex flex-col min-h-0 pt-[16px] px-8 pb-[30px]"
        >
          <SectionTableSkeleton rows={5} />
        </div>
      </div>
    )
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
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search section, coordinator, or academic year…"
            ariaLabel="Search sections"
            className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
          />
          <Filter value={phaseFilter} options={PHASE_OPTIONS} onChange={(v) => setPhaseFilter(v as PhaseFilter)} ariaLabel="Filter by capstone phase" />
        </div>
      </HeaderBar>

      <div className="flex-1 flex flex-col min-h-0 pt-[16px] px-8 pb-[30px]">
        <SectionTable sections={filtered} renderActions={handleRenderActions} onAssign={handleAssign} />
      </div>

      {createOpen && (
        <SectionModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSuccess={handleMutated}
        />
      )}

      {editing && (
        <SectionModal
          mode="global-edit"
          section={{
            id: editing.id,
            name: editing.section,
            academicYear: editing.academicYear,
          }}
          onClose={() => setEditing(null)}
          onSuccess={handleMutated}
        />
      )}

      {coordinatorAction ? (
        <CoordinatorActionModal
          action={coordinatorAction}
          onClose={() => setCoordinatorAction(null)}
          onSuccess={handleMutated}
        />
      ) : null}

      {archiving && (
        <ArchiveSectionModal
          section={{ id: archiving.id, name: archiving.section }}
          onClose={() => setArchiving(null)}
          onSuccess={handleMutated}
        />
      )}
    </div>
  )
}
