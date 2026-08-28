'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'
import { StepSectionGroup } from './wizard/StepSectionGroup'
import { StepSchedule } from './wizard/StepSchedule'
import { StepPanelists } from './wizard/StepPanelists'
import { StepReview } from './wizard/StepReview'
import type {
  DefenseType,
  FacultyMember,
  GroupOption,
  PanelSlot,
  PanelSlotState,
  SectionOption,
  WizardActionResponse,
} from './wizard/types'

// ───────────────────────────── Types & constants ─────────────────────────────

export type {
  SectionOption,
  GroupOption,
  FacultyMember,
  PanelSlot,
  PanelSlotState,
  WizardActionResponse,
} from './wizard/types'

// Parses an ISO date string ("2026-09-01" or full ISO) into a local-midnight
// Date so the calendar matches the date the coordinator really picked.
function parseDateKey(iso: string): Date {
  const parts = iso.slice(0, 10).split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

// "HH:MM" 24h strings compare correctly with a simple string compare.
function timeErrorFor(start: string, end: string): string | null {
  if (start && end && start >= end) {
    return 'End time must be after the start time.'
  }
  return null
}

interface CreateDefenseWizardProps {
  open: boolean
  onClose: () => void
  sections: SectionOption[]
  groups: GroupOption[]
  faculty: FacultyMember[]
  /** ISO dates that already have a schedule — marked on the calendar. */
  existingScheduleDates: string[]
  /**
   * When set, the wizard opens in edit mode: section/group are locked and the
   * form is pre-filled from the schedule being edited; submit includes the
   * scheduleId so the parent can route it to updateDefenseSchedule.
   */
  editingSchedule?: DefenseSchedulePayload | null
  onSubmit: (
    _prevState: any,
    formData: FormData,
  ) => Promise<WizardActionResponse>
}

const STEPS = [
  'Section & Group',
  'Schedule & Venue',
  'Panelists',
  'Review',
] as const

const EMPTY_SLOTS: PanelSlotState = {
  chair: null,
  member1: null,
  member2: null,
}

// ───────────────────────────── Pure helpers ─────────────────────────────

function toDateKey(date: Date | null): string {
  if (!date) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// ───────────────────────────── Sub-components ─────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex flex-col items-center gap-[5px]">
      <div className="flex gap-[8px]">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`h-[5px] w-[44px] rounded-full transition-colors ${
              index <= current ? 'bg-[#707dff]' : 'bg-[#e8ebf8]'
            }`}
          />
        ))}
      </div>
      <span className="font-sans text-[10px] leading-[13px] font-semibold text-[#5a6382]">
        {STEPS[current]}
      </span>
    </div>
  )
}

// ───────────────────────────── Wizard shell ─────────────────────────────

export function CreateDefenseWizard({
  open,
  onClose,
  sections,
  groups,
  faculty,
  existingScheduleDates,
  editingSchedule,
  onSubmit,
}: CreateDefenseWizardProps) {
  const [step, setStep] = useState(0)
  const [sectionId, setSectionId] = useState<number | null>(null)
  const [groupId, setGroupId] = useState<number | null>(null)
  const [defenseType, setDefenseType] = useState<DefenseType>('PROPOSAL')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venue, setVenue] = useState('')
  const [slots, setSlots] = useState<PanelSlotState>(EMPTY_SLOTS)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEdit = !!editingSchedule

  // Re-open always starts from a clean slate (create mode), or from the
  // schedule being edited — the parent switches modes by setting `open`
  // together with `editingSchedule`.
  useEffect(() => {
    if (!open) return
    setStep(0)
    setIsSubmitting(false)

    if (editingSchedule) {
      const group = groups.find((g) => g.id === editingSchedule.groupId)
      const chair =
        editingSchedule.panelists.find((p) => p.role === 'CHAIR') ?? null
      const members = editingSchedule.panelists.filter(
        (p) => p.role === 'PANEL_MEMBER',
      )
      setSectionId(group ? group.sectionId : null)
      setGroupId(editingSchedule.groupId)
      setDefenseType(editingSchedule.type)
      setSelectedDate(parseDateKey(editingSchedule.date))
      setStartTime(editingSchedule.startTime)
      setEndTime(editingSchedule.endTime)
      setVenue(editingSchedule.venue)
      setSlots({
        chair: chair ? { id: chair.userId, name: chair.name } : null,
        member1: members[0]
          ? { id: members[0].userId, name: members[0].name }
          : null,
        member2: members[1]
          ? { id: members[1].userId, name: members[1].name }
          : null,
      })
      return
    }

    setSectionId(null)
    setGroupId(null)
    setDefenseType('PROPOSAL')
    setSelectedDate(null)
    setStartTime('')
    setEndTime('')
    setVenue('')
    setSlots(EMPTY_SLOTS)
  }, [open, editingSchedule])

  const existingDates = useMemo(
    () => existingScheduleDates.map(parseDateKey),
    [existingScheduleDates],
  )

  if (!open) return null

  const sectionGroups = groups.filter((g) => g.sectionId === sectionId)
  const selectedSection = sections.find((s) => s.id === sectionId)
  const selectedGroup = sectionGroups.find((g) => g.id === groupId)

  const step1Valid =
    !!sectionId &&
    !!groupId &&
    !!selectedGroup &&
    (isEdit || !selectedGroup.hasSchedule)
  const timeError = timeErrorFor(startTime, endTime)
  const step2Valid =
    !!selectedDate &&
    !!startTime &&
    !!endTime &&
    !timeError &&
    venue.trim().length > 0
  const step3Valid = !!(slots.chair && slots.member1 && slots.member2)
  const canProceed =
    step === 0
      ? step1Valid
      : step === 1
        ? step2Valid
        : step === 2
          ? step3Valid
          : true
  const canSubmit = step1Valid && step2Valid && step3Valid

  function assignFacultyToSlot(slot: PanelSlot, member: FacultyMember) {
    setSlots((prev) => {
      const next = { ...prev }
      // A faculty member can only occupy one slot.
      if (next.chair?.id === member.id) next.chair = null
      if (next.member1?.id === member.id) next.member1 = null
      if (next.member2?.id === member.id) next.member2 = null
      next[slot] = member
      return next
    })
  }

  async function handleCreate() {
    const chair = slots.chair
    const member1 = slots.member1
    const member2 = slots.member2
    if (
      !canSubmit ||
      !groupId ||
      !selectedDate ||
      !chair ||
      !member1 ||
      !member2
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      if (isEdit && editingSchedule) {
        formData.set('scheduleId', String(editingSchedule.id))
      }
      formData.set('groupId', String(groupId))
      formData.set('type', defenseType)
      formData.set('date', toDateKey(selectedDate))
      formData.set('startTime', startTime)
      formData.set('endTime', endTime)
      formData.set('venue', venue.trim())
      formData.set(
        'panelists',
        JSON.stringify([
          { userId: chair.id, role: 'CHAIR' },
          { userId: member1.id, role: 'PANEL_MEMBER' },
          { userId: member2.id, role: 'PANEL_MEMBER' },
        ]),
      )

      const result = await onSubmit(null, formData)
      if (result.success) {
        toast.success(result.message || 'Defense schedule saved successfully.')
        onClose()
      } else {
        toast.error(result.message || 'Failed to save defense schedule.')
      }
    } catch {
      toast.error('Something went wrong while saving the schedule.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[3px] animate-in fade-in duration-200">
      <div className="bg-white w-fit rounded-2xl shadow-xl border border-[#e8ebf8] flex flex-col max-h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between px-[22px] pt-[18px] pb-[16px] border-b border-[#f0f2fa]">
          <div className="flex items-center gap-[10px]">
            <div className="size-[30px] rounded-[8px] bg-[rgba(112,125,255,0.05)] flex items-center justify-center">
              <Calendar className="size-[14px] text-[#707dff]" />
            </div>
            <h2 className="font-['Sora',sans-serif] font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
              {isEdit ? 'Edit Defense Schedule' : 'Create Defense Schedule'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-[28px] rounded-[7px] bg-[#f4f5fc] border border-[#e8ebf8] flex items-center justify-center hover:bg-[#eef0fb] transition-colors"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <div className="w-full overflow-y-auto p-[20px]">
          {step === 0 ? (
            <StepSectionGroup
              sections={sections}
              sectionGroups={sectionGroups}
              sectionId={sectionId}
              groupId={groupId}
              defenseType={defenseType}
              isEdit={isEdit}
              onSectionChange={(id) => {
                setSectionId(id)
                setGroupId(null)
              }}
              onGroupChange={setGroupId}
              onTypeChange={setDefenseType}
            />
          ) : null}
          {step === 1 ? (
            <StepSchedule
              selectedDate={selectedDate}
              startTime={startTime}
              endTime={endTime}
              venue={venue}
              existingDates={existingDates}
              onDateChange={setSelectedDate}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onVenueChange={setVenue}
            />
          ) : null}
          {step === 2 ? (
            <StepPanelists
              faculty={faculty}
              slots={slots}
              onAssign={assignFacultyToSlot}
              onRemove={(slot) =>
                setSlots((prev) => ({ ...prev, [slot]: null }))
              }
            />
          ) : null}
          {step === 3 ? (
            <StepReview
              sectionName={selectedSection?.name ?? ''}
              groupName={selectedGroup?.name ?? ''}
              defenseType={defenseType}
              date={selectedDate}
              startTime={startTime}
              endTime={endTime}
              venue={venue}
              slots={slots}
            />
          ) : null}
        </div>

        <div className="px-[22px] pt-[16px] pb-[16px] border-t border-[#f0f2fa]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[10px]">
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(0, prev - 1))}
                disabled={step === 0}
                className="flex items-center gap-[6px] px-[16px] py-[9px] rounded-[10px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] leading-[19.5px] text-[#5a6382] hover:bg-[#fafbff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-[14px]" />
                Back
              </button>
            </div>

            <StepIndicator current={step} />

            <div className="flex justify-end">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                  disabled={!canProceed}
                  className="flex items-center gap-[6px] px-[20px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
                  style={{
                    backgroundImage:
                      'linear-gradient(163.7deg, rgb(112, 125, 255) 0%, rgb(85, 101, 255) 100%)',
                    boxShadow: '0px 4px 6px rgba(112,125,255,0.25)',
                  }}
                >
                  Next
                  <ChevronRight className="size-[14px]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!canSubmit || isSubmitting}
                  className="px-[20px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
                  style={{
                    backgroundImage:
                      'linear-gradient(163.7deg, rgb(112, 125, 255) 0%, rgb(85, 101, 255) 100%)',
                    boxShadow: '0px 4px 6px rgba(112,125,255,0.25)',
                  }}
                >
                  {isSubmitting
                    ? isEdit
                      ? 'Saving…'
                      : 'Creating…'
                    : isEdit
                      ? 'Save'
                      : 'Create'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
