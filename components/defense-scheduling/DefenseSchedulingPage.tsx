'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, ChevronDown, Plus } from 'lucide-react'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
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
import {
  createDefenseSchedule,
  rescheduleForRedefense,
} from '@/lib/actions/defense'
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

/** The orderings the mobile select offers, in the order it lists them. */
const SCHEDULE_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', field: 'datetime', dir: 'desc' },
  { value: 'oldest', label: 'Oldest', field: 'datetime', dir: 'asc' },
  { value: 'az', label: 'A-Z', field: 'group', dir: 'asc' },
  { value: 'za', label: 'Z-A', field: 'group', dir: 'desc' },
] as const

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
  const [reschedulingSchedule, setReschedulingSchedule] =
    useState<DefenseSchedulePayload | null>(null)
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

  // Mobile-only ordering. The table sorts by clicking a column header, and the
  // card list below sm has no headers, so this writes the same sortField/sortDir
  // pair rather than sorting a second list independently. Mirrors the control on
  // the templates list.
  const sortValue =
    sortField === 'datetime'
      ? sortDir === 'asc'
        ? 'oldest'
        : 'newest'
      : sortField === 'group' && sortDir === 'asc'
        ? 'az'
        : sortField === 'group'
          ? 'za'
          : // section / type / venue / verdict are only reachable from the desktop
            // headers, so there is no mobile option for them. Report the default
            // rather than a label contradicting the actual order.
            'newest'

  function handleSortSelect(next: string) {
    const option = SCHEDULE_SORT_OPTIONS.find((o) => o.value === next)
    if (!option) return
    setSortField(option.field)
    setSortDir(option.dir)
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
    setReschedulingSchedule(null)
    setWizardOpen(true)
  }

  function closeWizard() {
    setWizardOpen(false)
    setReschedulingSchedule(null)
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

  function handleReschedule(schedule: DefenseSchedulePayload) {
    setReschedulingSchedule(schedule)
    setWizardOpen(true)
  }

  async function handleWizardSubmit(_prevState: any, formData: FormData) {
    const result = reschedulingSchedule
      ? await rescheduleForRedefense(_prevState, formData)
      : await createDefenseSchedule(_prevState, formData)
    if (result.success) {
      setReschedulingSchedule(null)
      router.refresh()
    }
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
    { value: 'REDEFENSE', label: 'Redefense' },
  ]

  return (
    <>
      <HeaderBar
        actions={
          // Hidden below sm — the floating button carries the action there.
          <button
            type="button"
            onClick={openCreateWizard}
            className="hidden sm:flex items-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] text-white rounded-lg font-sans font-semibold text-[13px] shadow-[0px_2px_5px_rgba(112,125,255,0.25)] hover:bg-[#5565ff] active:scale-[0.98] transition-all shrink-0"
          >
            <Plus className="size-4" strokeWidth={2} />
            <span className="whitespace-nowrap">New Defense Schedule</span>
          </button>
        }
      >
        <div className="flex flex-nowrap items-center gap-2.5 w-max">
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
            // Capped rather than w-full / flex-1: this bar scrolls horizontally
            // now, so a flexible search would either collapse the strip or
            // fight the w-max wrapper. Matches the search on the other bars.
            className="w-[280px] shrink-0 sm:w-[320px]"
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

      <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-8 pt-[16px] pb-[30px]">
        {/* Mobile-only ordering. Hidden from sm up because the desktop grid
            already sorts by clicking its column headers, and a second control
            there would just duplicate them. */}
        <div className="sm:hidden flex items-center justify-start gap-[10px] mb-[12px] shrink-0">
          <div className="relative">
            <select
              aria-label="Sort schedules"
              value={sortValue}
              onChange={(e) => handleSortSelect(e.target.value)}
              className="appearance-none h-[37.5px] pl-[13px] pr-[36px] bg-white border border-[#e8ebf8] rounded-lg font-sans font-semibold text-[13px] text-[#5a6382] cursor-pointer focus:outline-none focus:border-[rgba(112,125,255,0.6)] hover:border-[rgba(112,125,255,0.6)] transition-colors"
            >
              {SCHEDULE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 size-4 text-[#8a93b4]"
            />
          </div>
        </div>

        <DefenseTable
          schedules={visible}
          currentUserId={currentUserId}
          onView={handleView}
          onDelete={handleDelete}
          onReschedule={handleReschedule}
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
        editingSchedule={reschedulingSchedule}
        title={
          reschedulingSchedule ? 'Reschedule for Redefense' : undefined
        }
        onSubmit={handleWizardSubmit}
      />

        <ConfirmDeleteModal
          open={!!deletingSchedule}
          schedule={deletingSchedule}
          onClose={() => setDeletingSchedule(null)}
          onConfirmed={() => router.refresh()}
        />

        {/* Mobile stand-in for the New Defense Schedule button in the bar. */}
        <FloatingActionButton
          icon={<CalendarPlus className="size-6" strokeWidth={2} />}
          label="New Defense Schedule"
          onClick={openCreateWizard}
        />
      </>
    )
}
