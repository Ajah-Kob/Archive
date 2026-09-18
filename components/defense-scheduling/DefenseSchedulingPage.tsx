'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { DefenseTable, type SortKey } from '@/components/defense-scheduling/DefenseTable'
import { DefenseDetailsDrawer } from '@/components/defense-scheduling/DefenseDetailsDrawer'
import { CreateDefenseWizard } from '@/components/defense-scheduling/CreateDefenseWizard'
import {
  ConfirmDeleteModal,
  type DefenseScheduleSummary,
} from '@/components/defense-scheduling/ConfirmDeleteModal'
import { createDefenseSchedule } from '@/lib/actions/defense'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'
import type {
  DefenseWizardGroup,
  DefenseWizardSection,
} from '@/lib/actions/defense'

interface DefenseSchedulingPageProps {
  /** Schedules loaded by the server page (getDefenseSchedules). */
  schedules: DefenseSchedulePayload[]
  /** Wizard/filter options loaded by the server page. */
  sections: DefenseWizardSection[]
  groups: DefenseWizardGroup[]
  /** Panelist candidates: live faculty (id/name pairs). */
  faculty: { id: number; name: string }[]
  /** Session user id — ownership drives row/drawer actions. */
  currentUserId: number
}

/**
 * Client orchestrator for /faculty/defense-scheduling. Owns every piece of
 * page state (filters, drawer, wizard, delete target) and wires the table,
 * toolbar, drawer, wizard, delete modal and empty state together. Mutations
 * revalidate the 'defense' cache tag on the server; router.refresh() re-runs
 * the server page so the fresh props flow back down through this component.
 */
export function DefenseSchedulingPage({
  schedules,
  sections,
  groups,
  faculty,
  currentUserId,
}: DefenseSchedulingPageProps) {
  const router = useRouter()

  // ── Toolbar state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<SortKey>('datetime')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  // "All" toggle — ON by default so every schedule (including those created
  // by coordinators) is shown. Toggling OFF narrows to the current user's
  // own schedules.
  const [mySchedules, setMySchedules] = useState(true)

  // ── Overlay state ────────────────────────────────────────────────────────
  const [selectedSchedule, setSelectedSchedule] =
    useState<DefenseSchedulePayload | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deletingSchedule, setDeletingSchedule] =
    useState<DefenseScheduleSummary | null>(null)

  // Dates that already have a schedule, for the wizard calendar dots.
  const existingScheduleDates = useMemo(
    () => schedules.map((s) => s.date),
    [schedules],
  )

  // Same-day taken time ranges, for disabling conflicting times in the
  // wizard time pickers (the wizard narrows these to the selected date).
  const existingSchedules = useMemo(
    () =>
      schedules.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    [schedules],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return schedules.filter((s) => {
      // "All" toggle ON shows every schedule; OFF narrows to the current
      // user's own schedules.
      if (!mySchedules && Number(s.createdById) !== Number(currentUserId)) {
        return false
      }
      if (typeFilter && s.type !== typeFilter) return false
      if (statusFilter && s.verdict !== statusFilter) return false
      if (!term) return true
      return (
        s.groupName.toLowerCase().includes(term) ||
        s.sectionName.toLowerCase().includes(term) ||
        s.venue.toLowerCase().includes(term) ||
        s.createdByName.toLowerCase().includes(term)
      )
    })
  }, [
    schedules,
    search,
    typeFilter,
    statusFilter,
    mySchedules,
    currentUserId,
  ])

  function handleSort(field: SortKey) {
    setSortDir((prev) =>
      sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'desc',
    )
    setSortField(field)
  }

  const visible = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case 'group':
          return a.groupName.localeCompare(b.groupName) * dir
        case 'section':
          return a.sectionName.localeCompare(b.sectionName) * dir
        case 'type':
          return a.type.localeCompare(b.type) * dir
        case 'datetime': {
          const day =
            new Date(a.date).getTime() - new Date(b.date).getTime()
          if (day !== 0) return day * dir
          return a.startTime.localeCompare(b.startTime) * dir
        }
        case 'venue':
          return a.venue.localeCompare(b.venue) * dir
        case 'verdict':
          return a.verdict.localeCompare(b.verdict) * dir
      }
    })
  }, [filtered, sortField, sortDir])

  function openCreateWizard() {
    setWizardOpen(true)
  }

  function closeWizard() {
    setWizardOpen(false)
  }

  function handleView(schedule: DefenseSchedulePayload) {
    setSelectedSchedule(schedule)
  }

  function handleDelete(schedule: DefenseSchedulePayload) {
    setSelectedSchedule(null)
    setDeletingSchedule({
      id: schedule.id,
      groupName: schedule.groupName,
      date: schedule.date,
    })
  }

  async function handleWizardSubmit(_prevState: any, formData: FormData) {
    const result = await createDefenseSchedule(_prevState, formData)
    if (result.success) router.refresh()
    return result
  }

  const hasAnySchedules = schedules.length > 0

  const TYPE_OPTIONS: ReadonlyArray<FilterOption> = [
    { value: '', label: 'All Types' },
    { value: 'PROPOSAL', label: 'Proposal Defense' },
    { value: 'FINAL', label: 'Final Defense' },
  ]

  const STATUS_OPTIONS: ReadonlyArray<FilterOption> = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'No Verdict' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'MINOR_REVISION', label: 'Minor Revisions' },
    { value: 'MAJOR_REVISION', label: 'Major Revisions' },
    { value: 'REJECTED', label: 'Rejected' },
  ]

  return (
    <>
      <HeaderBar
        actions={
          <button
            type="button"
            onClick={openCreateWizard}
            className="flex items-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] text-white rounded-lg font-sans font-semibold text-[13px] shadow-[0px_2px_5px_rgba(112,125,255,0.25)] hover:bg-[#5565ff] active:scale-[0.98] transition-all shrink-0"
          >
            <Plus className="size-4" strokeWidth={2} />
            <span className="whitespace-nowrap">New Defense Schedule</span>
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={mySchedules}
            onClick={() => setMySchedules(!mySchedules)}
            className="flex items-center gap-2 h-[37.5px] px-[13px] bg-white border border-[#e8ebf8] rounded-lg hover:border-[rgba(112,125,255,0.6)] transition-colors shrink-0"
          >
            <span className="font-sans font-semibold text-[13px] text-[#5a6382] whitespace-nowrap">
              All
            </span>
            <span
              className={`relative w-[32px] h-[18px] rounded-full transition-colors ${
                mySchedules ? 'bg-[#707dff]' : 'bg-[#dddff0]'
              }`}
            >
              <span
                className={`absolute top-[2.5px] left-[2.5px] size-[13px] bg-white rounded-full shadow-sm transition-transform ${
                  mySchedules ? 'translate-x-[14px]' : ''
                }`}
              />
            </span>
          </button>

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search schedules..."
            ariaLabel="Search defense schedules"
            className="flex-1 min-w-[200px] max-w-[320px]"
          />

          <Filter
            value={typeFilter}
            options={TYPE_OPTIONS}
            onChange={setTypeFilter}
            ariaLabel="Filter by defense type"
          />
          <Filter
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
            ariaLabel="Filter by status"
          />
        </div>
      </HeaderBar>

      <div className="flex-1 flex flex-col min-h-0 px-8 pt-[16px] pb-[30px]">
        <DefenseTable
          schedules={visible}
          currentUserId={currentUserId}
          onView={handleView}
          onDelete={handleDelete}
          hasAnySchedules={hasAnySchedules}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      <DefenseDetailsDrawer
        schedule={selectedSchedule}
        currentUserId={currentUserId}
        onClose={() => setSelectedSchedule(null)}
        onDelete={handleDelete}
      />

      <CreateDefenseWizard
        open={wizardOpen}
        onClose={closeWizard}
        sections={sections}
        groups={groups}
        faculty={faculty}
        existingScheduleDates={existingScheduleDates}
        existingSchedules={existingSchedules}
        editingSchedule={null}
        onSubmit={handleWizardSubmit}
      />

      <ConfirmDeleteModal
        open={!!deletingSchedule}
        schedule={deletingSchedule}
        onClose={() => setDeletingSchedule(null)}
        onConfirmed={() => router.refresh()}
      />
    </>
  )
}
