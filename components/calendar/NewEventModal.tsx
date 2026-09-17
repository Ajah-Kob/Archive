'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Switch from '@mui/material/Switch'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import {
  createCalendarEvent,
  updateCalendarEvent,
  type CalendarFeedEvent,
} from '@/lib/actions/calendar'
import { parseManualCalendarId } from '@/components/calendar/EventDetailsModal'
import type { CalendarDateSpan } from '@/components/calendar/CalendarClient'

// ───────────────────────────── constants + pure helpers ─────────────────────────────

type ManualAudience = 'STUDENT' | 'FACULTY' | 'ALL'

const AUDIENCE_OPTIONS: ReadonlyArray<{ value: ManualAudience; label: string }> = [
  { value: 'STUDENT', label: 'Students' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'ALL', label: 'All' },
]

const TITLE_MAX = 200
const DESCRIPTION_MAX = 2000

// ISO string → Date (null when unparseable).
function toDateValue(iso: string): Date | null {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

// 'YYYY-MM-DD' → local-midnight Date (null when unparseable). Never uses the
// bare `new Date(day)` form, which parses date-only strings as UTC midnight
// and shifts the day behind in +UTC timezones.
function parseDayLocal(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day)
  if (!match) return null
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

// FullCalendar span → Date pair + all-day flag. All-day selects carry an
// exclusive end (single-day drag = start+1 day), so a one-day span collapses
// to a single day (the feed's end === start convention) and longer drags
// shift the end back one day. Timed selects pass through exactly (and prefill
// the toggle off via allDay: false).
function spanToDateInputs(span: CalendarDateSpan): {
  start: Date | null
  end: Date | null
  allDay: boolean
} {
  if (!span.allDay) {
    return { start: toDateValue(span.startStr), end: toDateValue(span.endStr), allDay: false }
  }
  const startDay = span.startStr.slice(0, 10)
  const endDay = span.endStr.slice(0, 10)
  const start = parseDayLocal(startDay)
  const endExclusive = parseDayLocal(endDay)
  if (!start || !endExclusive || endExclusive.getTime() <= start.getTime()) {
    return { start, end: start ? new Date(start) : null, allDay: true }
  }
  const spanDays = Math.round((endExclusive.getTime() - start.getTime()) / 86_400_000)
  if (spanDays <= 1) {
    return { start, end: new Date(start), allDay: true }
  }
  return { start, end: new Date(endExclusive.getTime() - 86_400_000), allDay: true }
}

// Submit-time ISO: all-day values are forced to local midnight (the pickers
// already return midnight Dates — this guards the toggle path), timed values
// pass through exactly (the previous datetime-local semantics).
function toSubmitISO(value: Date, allDay: boolean): string {
  if (!allDay) return value.toISOString()
  const midnight = new Date(value)
  midnight.setHours(0, 0, 0, 0)
  return midnight.toISOString()
}

// Client-side gating mirroring the server messages in createCalendarEvent /
// updateCalendarEvent. Returns the first problem, or null when submittable.
function getFirstInvalid(
  title: string,
  description: string,
  start: Date | null,
  end: Date | null,
): string | null {
  if (title.trim().length === 0) return 'Title is required.'
  if (title.trim().length > TITLE_MAX) return `Title must be at most ${TITLE_MAX} characters.`
  if (description.trim().length > DESCRIPTION_MAX) {
    return `Description must be at most ${DESCRIPTION_MAX} characters.`
  }
  if (!start || !end) return 'Start and end dates are required.'
  const startTime = start.getTime()
  const endTime = end.getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 'Valid start and end dates are required.'
  }
  if (endTime < startTime) {
    return 'End date must be on or after the start date.'
  }
  return null
}

// ───────────────────────────── shared field markup ─────────────────────────────

const inputClass =
  'h-[38px] w-full rounded-[9px] border border-[#e8ebf8] px-[12px] font-sans font-medium text-[13px] leading-[19px] text-[#1e2145] bg-white outline-none transition-colors focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)] placeholder:text-[#9ea8c6] placeholder:font-normal'

const labelClass = 'font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]'

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={labelClass}>
      {children}
    </label>
  )
}

// Explicit variants (AGENTS.md): date-only vs timed pickers — never a
// boolean-mode picker. Module-level so cells don't remount on every render.
// LocalizationProvider + archive theme come from app/providers.tsx; past
// dates stay selectable (backdated archives exist).
function AllDayPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: Date | null
  onChange: (next: Date | null) => void
  disabled: boolean
}) {
  return (
    <DatePicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      slotProps={{ textField: { id, size: 'small', fullWidth: true } }}
    />
  )
}

function TimedPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: Date | null
  onChange: (next: Date | null) => void
  disabled: boolean
}) {
  return (
    <DateTimePicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      ampm={false}
      slotProps={{ textField: { id, size: 'small', fullWidth: true } }}
    />
  )
}

// Controlled manual-event fields shared by the create + edit variants below.
// The parent owns all values; this component only renders inputs.
function ManualEventFields({
  idPrefix,
  title,
  onTitleChange,
  scope,
  onScopeChange,
  allDay,
  onAllDayChange,
  start,
  onStartChange,
  end,
  onEndChange,
  description,
  onDescriptionChange,
  disabled,
}: {
  idPrefix: string
  title: string
  onTitleChange: (next: string) => void
  scope: ManualAudience
  onScopeChange: (next: ManualAudience) => void
  allDay: boolean
  onAllDayChange: (next: boolean) => void
  start: Date | null
  onStartChange: (next: Date | null) => void
  end: Date | null
  onEndChange: (next: Date | null) => void
  description: string
  onDescriptionChange: (next: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex flex-col gap-[6px]">
        <FieldLabel htmlFor={`${idPrefix}-title`}>
          Title <span className="text-[#ef4444]">*</span>
        </FieldLabel>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={disabled}
          maxLength={TITLE_MAX + 20}
          placeholder="e.g. Manuscript deadline"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <FieldLabel htmlFor={`${idPrefix}-scope`}>
          Scope <span className="text-[#ef4444]">*</span>
        </FieldLabel>
        <select
          id={`${idPrefix}-scope`}
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as ManualAudience)}
          disabled={disabled}
          className={inputClass}
        >
          {AUDIENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-[14px] sm:flex-row sm:items-end sm:gap-[12px]">
        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          <FieldLabel htmlFor={`${idPrefix}-start`}>
            Starts <span className="text-[#ef4444]">*</span>
          </FieldLabel>
          {allDay ? (
            <AllDayPicker
              id={`${idPrefix}-start`}
              value={start}
              onChange={onStartChange}
              disabled={disabled}
            />
          ) : (
            <TimedPicker
              id={`${idPrefix}-start`}
              value={start}
              onChange={onStartChange}
              disabled={disabled}
            />
          )}
        </div>

        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          <FieldLabel htmlFor={`${idPrefix}-end`}>
            Ends <span className="text-[#ef4444]">*</span>
          </FieldLabel>
          {allDay ? (
            <AllDayPicker
              id={`${idPrefix}-end`}
              value={end}
              onChange={onEndChange}
              disabled={disabled}
            />
          ) : (
            <TimedPicker
              id={`${idPrefix}-end`}
              value={end}
              onChange={onEndChange}
              disabled={disabled}
            />
          )}
        </div>

        {/* Wrapping label toggles the switch; h-[40px] lines it up with the
            picker inputs, pinned right on both stacked and row layouts. */}
        <label className="flex items-center gap-[6px] h-[40px] shrink-0 self-end sm:self-auto cursor-pointer select-none">
          <span className="font-sans font-semibold text-[13px] leading-[19px] text-[#3a4170]">
            All day
          </span>
          <Switch
            checked={allDay}
            onChange={(e) => onAllDayChange(e.target.checked)}
            disabled={disabled}
            size="small"
          />
        </label>
      </div>

      <div className="flex flex-col gap-[6px]">
        <FieldLabel htmlFor={`${idPrefix}-description`}>Description</FieldLabel>
        <textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={disabled}
          rows={3}
          placeholder="Optional details shown in the event popup."
          className="w-full rounded-[9px] border border-[#e8ebf8] px-[12px] py-[10px] font-sans font-medium text-[13px] leading-[19px] text-[#1e2145] bg-white outline-none transition-colors focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)] placeholder:text-[#9ea8c6] placeholder:font-normal resize-y min-h-[76px]"
        />
      </div>
    </div>
  )
}

// ───────────────────────────── shared modal chrome ─────────────────────────────

function EventModalFrame({
  title,
  subtitle,
  onClose,
  disabled,
  footer,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  disabled: boolean
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => setMounted(true), [])

  const handleClose = useCallback(() => {
    if (disabled) return
    onClose()
  }, [disabled, onClose])

  // Focus + Esc + body lock while open (DeleteArchiveModal precedent).
  useEffect(() => {
    if (!mounted) return

    const previouslyFocused = globalThis.document.activeElement as HTMLElement | null
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0)

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    globalThis.document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = globalThis.document.body.style.overflow
    globalThis.document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(t)
      globalThis.document.removeEventListener('keydown', handleKeyDown)
      globalThis.document.body.style.overflow = prevOverflow
      previouslyFocused?.focus()
    }
  }, [mounted, handleClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) handleClose()
    },
    [handleClose],
  )

  if (!mounted) return null

  const content = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16),0_4px_16px_rgba(0,0,0,0.06)] border border-[#eceef8] w-full max-w-[520px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[24px] pt-[20px] pb-[14px] border-b border-[#f0f2fa] shrink-0 bg-white">
          <div className="flex items-start justify-between gap-[16px]">
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-[16px] leading-[24px] tracking-[-0.16px] text-[#10133a]">
                {title}
              </h2>
              {subtitle ? (
                <p className="font-sans font-medium text-[12.5px] leading-[18px] text-[#8a93b4] pt-[2px]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              disabled={disabled}
              aria-label={`Close ${title.toLowerCase()}`}
              className="size-[30px] rounded-[10px] bg-[#fafbff] border border-[#eceef8] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]"
            >
              <X className="size-[14px] text-[#8a93b4]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] py-[20px]">{children}</div>

        <div className="border-t border-[#f0f2fa] bg-white px-[24px] py-[16px] shrink-0 flex items-center justify-end gap-[10px]">
          {footer}
        </div>
      </div>
    </div>
  )

  return createPortal(content, globalThis.document.body)
}

// ───────────────────────────── NewEventModal (create variant) ─────────────────────────────

interface NewEventModalProps {
  /** Null = closed. Non-null span prefills the date inputs (date-select or + New Event). */
  span: CalendarDateSpan | null
  onClose: () => void
}

/**
 * Chair/admin-only create form for manual calendar events. Opened from a
 * grid span-select (dates prefilled) or the + New Event button. Wires to
 * createCalendarEvent; toasts + router.refresh() on success (the mutation
 * already revalidates the calendar tag). Never rendered for read-only roles —
 * CalendarClient gates it behind canManage.
 */
export function NewEventModal({ span, onClose }: NewEventModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<ManualAudience>('ALL')
  const [allDay, setAllDay] = useState(true)
  const [start, setStart] = useState<Date | null>(null)
  const [end, setEnd] = useState<Date | null>(null)
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Prefill from the selected span whenever a new span opens the modal.
  // The all-day flag follows the span (timed drags in
  // week/day view open with the toggle off, times preserved).
  useEffect(() => {
    if (!span) return
    const inputs = spanToDateInputs(span)
    setTitle('')
    setScope('ALL')
    setAllDay(inputs.allDay)
    setStart(inputs.start)
    setEnd(inputs.end)
    setDescription('')
    setIsSaving(false)
  }, [span])

  const handleSubmit = useCallback(async () => {
    if (isSaving) return
    const invalid = getFirstInvalid(title, description, start, end)
    if (invalid) {
      toast.error(invalid)
      return
    }
    // Narrowed for TS — getFirstInvalid above already rejected nulls.
    if (start == null || end == null) return
    setIsSaving(true)
    try {
      const res = await createCalendarEvent(null, {
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        startsAt: toSubmitISO(start, allDay),
        endsAt: toSubmitISO(end, allDay),
        allDay,
        audience: scope,
      })
      if (res.success) {
        toast.success(res.message || 'Calendar event created.')
        onClose()
        router.refresh()
      } else {
        toast.error(res.message || 'Failed to create calendar event. Please try again.')
      }
    } catch {
      toast.error('Failed to create calendar event. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, title, description, start, end, allDay, scope, onClose, router])

  if (!span) return null

  return (
    <EventModalFrame
      title="New Event"
      onClose={onClose}
      disabled={isSaving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            aria-label="Create calendar event"
            className="inline-flex items-center justify-center gap-[8px] h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] bg-gradient-to-r from-[#707dff] to-[#5565ff] border border-[rgba(112,125,255,0.2)] hover:opacity-95 active:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)] min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-[14px] animate-spin" />
                Creating…
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </>
      }
    >
      <ManualEventFields
        idPrefix="new-event"
        title={title}
        onTitleChange={setTitle}
        scope={scope}
        onScopeChange={setScope}
        allDay={allDay}
        onAllDayChange={setAllDay}
        start={start}
        onStartChange={setStart}
        end={end}
        onEndChange={setEnd}
        description={description}
        onDescriptionChange={setDescription}
        disabled={isSaving}
      />
    </EventModalFrame>
  )
}

// ───────────────────────────── EditEventModal (edit variant) ─────────────────────────────

interface EditEventModalProps {
  /** Null = closed. Only manual feed events carry an editable row. */
  event: CalendarFeedEvent | null
  onClose: () => void
}

/**
 * Chair/admin-only edit form for an existing manual calendar event. Prefilled
 * from the feed row; wires to updateCalendarEvent with the same validation as
 * create. Opened from EventDetailsModal's Edit action. Never rendered for
 * read-only roles — CalendarClient gates it behind canManage.
 */
export function EditEventModal({ event, onClose }: EditEventModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<ManualAudience>('ALL')
  const [allDay, setAllDay] = useState(true)
  const [start, setStart] = useState<Date | null>(null)
  const [end, setEnd] = useState<Date | null>(null)
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Prefill from the manual feed row whenever a different event opens.
  // The all-day flag comes from the stored row.
  useEffect(() => {
    if (!event) return
    setTitle(event.title ?? '')
    setScope(
      event.audience === 'STUDENT' || event.audience === 'FACULTY' ? event.audience : 'ALL',
    )
    setAllDay(event.allDay)
    setStart(toDateValue(event.start))
    setEnd(toDateValue(event.end))
    setDescription(event.description ?? '')
    setIsSaving(false)
  }, [event])

  const handleSubmit = useCallback(async () => {
    if (isSaving || !event) return
    const manualId = parseManualCalendarId(event)
    if (manualId == null) {
      toast.error('Only manual events can be edited.')
      return
    }
    const invalid = getFirstInvalid(title, description, start, end)
    if (invalid) {
      toast.error(invalid)
      return
    }
    // Narrowed for TS — getFirstInvalid above already rejected nulls.
    if (start == null || end == null) return
    setIsSaving(true)
    try {
      const res = await updateCalendarEvent(manualId, {
        title: title.trim(),
        description: description.trim() === '' ? '' : description.trim(),
        startsAt: toSubmitISO(start, allDay),
        endsAt: toSubmitISO(end, allDay),
        allDay,
        audience: scope,
      })
      if (res.success) {
        toast.success(res.message || 'Calendar event updated.')
        onClose()
        router.refresh()
      } else {
        toast.error(res.message || 'Failed to update calendar event. Please try again.')
      }
    } catch {
      toast.error('Failed to update calendar event. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, event, title, description, start, end, allDay, scope, onClose, router])

  if (!event) return null

  return (
    <EventModalFrame
      title="Edit Event"
      subtitle="Saving updates the calendar immediately."
      onClose={onClose}
      disabled={isSaving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            aria-label="Save calendar event changes"
            className="inline-flex items-center justify-center gap-[8px] h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] bg-gradient-to-r from-[#707dff] to-[#5565ff] border border-[rgba(112,125,255,0.2)] hover:opacity-95 active:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)] min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-[14px] animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </>
      }
    >
      <ManualEventFields
        idPrefix="edit-event"
        title={title}
        onTitleChange={setTitle}
        scope={scope}
        onScopeChange={setScope}
        allDay={allDay}
        onAllDayChange={setAllDay}
        start={start}
        onStartChange={setStart}
        end={end}
        onEndChange={setEnd}
        description={description}
        onDescriptionChange={setDescription}
        disabled={isSaving}
      />
    </EventModalFrame>
  )
}

export default NewEventModal
