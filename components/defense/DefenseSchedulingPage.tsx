'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DefenseTable } from '@/components/defense/DefenseTable'
import { DefenseDetailsDrawer } from '@/components/defense/DefenseDetailsDrawer'
import { CreateDefenseWizard } from '@/components/defense/CreateDefenseWizard'
import {
  ConfirmDeleteModal,
  type DefenseScheduleSummary,
} from '@/components/defense/ConfirmDeleteModal'
import {
  createDefenseSchedule,
  updateDefenseSchedule,
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
  const [sectionFilter, setSectionFilter] = useState('')
  // "All" toggle — ON by default so every schedule (including those created
  // by coordinators) is shown. Toggling OFF narrows to the current user's
  // own schedules.
  const [mySchedules, setMySchedules] = useState(true)

  // ── Overlay state ────────────────────────────────────────────────────────
  const [selectedSchedule, setSelectedSchedule] =
    useState<DefenseSchedulePayload | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] =
    useState<DefenseSchedulePayload | null>(null)
  const [deletingSchedule, setDeletingSchedule] =
    useState<DefenseScheduleSummary | null>(null)

  // The section filter dropdown is keyed by section id, but the schedule
  // payload only carries the section name — resolve ids to names for the
  // comparison (duplicate names across coordinators are rare and benign).
  const sectionNamesById = useMemo(
    () => new Map(sections.map((s) => [s.id, s.name])),
    [sections],
  )

  // Dates that already have a schedule, for the wizard calendar dots.
  const existingScheduleDates = useMemo(
    () => schedules.map((s) => s.date),
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
      if (sectionFilter) {
        const name = sectionNamesById.get(Number(sectionFilter))
        if (!name || s.sectionName !== name) return false
      }
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
    sectionFilter,
    mySchedules,
    currentUserId,
    sectionNamesById,
  ])

  function openCreateWizard() {
    setEditingSchedule(null)
    setWizardOpen(true)
  }

  function closeWizard() {
    setWizardOpen(false)
    setEditingSchedule(null)
  }

  function handleView(schedule: DefenseSchedulePayload) {
    setSelectedSchedule(schedule)
  }

  function handleEdit(schedule: DefenseSchedulePayload) {
    setSelectedSchedule(null)
    setEditingSchedule(schedule)
    setWizardOpen(true)
  }

  function handleDelete(schedule: DefenseSchedulePayload) {
    setSelectedSchedule(null)
    setDeletingSchedule({
      id: schedule.id,
      groupName: schedule.groupName,
      date: schedule.date,
    })
  }

  // The wizard stays action-agnostic: create when no schedule is being
  // edited, update otherwise (the action reads scheduleId from the form).
  async function handleWizardSubmit(_prevState: any, formData: FormData) {
    const result = editingSchedule
      ? await updateDefenseSchedule(_prevState, formData)
      : await createDefenseSchedule(_prevState, formData)
    if (result.success) router.refresh()
    return result
  }

  const hasAnySchedules = schedules.length > 0

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        <DefenseTable
          schedules={filtered}
          currentUserId={currentUserId}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sectionFilter={sectionFilter}
          onSectionFilterChange={setSectionFilter}
          mySchedules={mySchedules}
          onMySchedulesChange={setMySchedules}
          sections={sections}
          onNew={openCreateWizard}
          hasAnySchedules={hasAnySchedules}
        />
      </div>

      <DefenseDetailsDrawer
        schedule={selectedSchedule}
        currentUserId={currentUserId}
        onClose={() => setSelectedSchedule(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <CreateDefenseWizard
        open={wizardOpen}
        onClose={closeWizard}
        sections={sections}
        groups={groups}
        faculty={faculty}
        existingScheduleDates={existingScheduleDates}
        editingSchedule={editingSchedule}
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
