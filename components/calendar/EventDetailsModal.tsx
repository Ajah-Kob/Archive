'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  X,
  CalendarDays,
  ExternalLink,
  MapPin,
  Pencil,
  Trash2,
  Loader2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteCalendarEvent,
  type CalendarFeedEvent,
  type CalendarFeedKind,
} from '@/lib/actions/calendar'

interface EventDetailsModalProps {
  event: CalendarFeedEvent | null
  canManage?: boolean
  onClose: () => void
  /** Pluggable edit entry — CalendarClient swaps to the edit variant. */
  onEdit?: (event: CalendarFeedEvent) => void
}

// ───────────────────────────── pure helpers ─────────────────────────────

// Manual feed ids are `manual-{rowId}`; automatic kinds carry composite string
// ids with no writable row. Returns the row id for manual events, null
// otherwise. Shared with NewEventModal.tsx (edit/delete identity).
export function parseManualCalendarId(event: CalendarFeedEvent): number | null {
  if (event.kind !== 'manual') return null
  const raw = event.id.replace(/^manual-/, '')
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function getAudienceLabel(audience: string | null | undefined): string {
  if (audience === 'STUDENT') return 'Students'
  if (audience === 'FACULTY') return 'Faculty'
  return 'All'
}

// Deep-link button copy per automatic kind (href comes straight from the
// feed). Manual events link back to /calendar itself, so they get no button —
// Edit/Delete are their actions.
const DEEP_LINK_LABEL: Record<CalendarFeedKind, string | null> = {
  defense: 'Open defense',
  'milestone-opened': 'Open milestone',
  'milestone-submission': 'Open submission',
  archive: 'Open in repository',
  manual: null,
}

function formatEventSpan(startISO: string, endISO: string, allDay: boolean): string {
  const start = new Date(startISO)
  const end = new Date(endISO)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return startISO
  const dateFmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeFmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const sameDay = start.toDateString() === end.toDateString()
  if (allDay) {
    return sameDay ? dateFmt(start) : `${dateFmt(start)} – ${dateFmt(end)}`
  }
  return sameDay
    ? `${dateFmt(start)} · ${timeFmt(start)} – ${timeFmt(end)}`
    : `${dateFmt(start)} ${timeFmt(start)} – ${dateFmt(end)} ${timeFmt(end)}`
}

// ───────────────────────────── presentational pieces ─────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-heading font-bold text-[11px] uppercase tracking-[0.6px] text-[#9ea8c6] mb-[6px]">
        {label}
      </p>
      {children}
    </div>
  )
}

// ───────────────────────────── EventDetailsModal ─────────────────────────────

/**
 * Click-through details for any calendar feed event (all roles).
 * Title, date span, venue (defenses) / description, group +
 * section context (defenses) or audience (manual events), and a deep-link
 * button whose href comes from the feed.
 * Manual events additionally offer Edit/Delete when canManage — Edit delegates
 * to onEdit (pluggable), Delete confirms inline then soft-deletes via
 * deleteCalendarEvent. Overlay/Esc/focus/body-lock follow DeleteArchiveModal.
 */
export function EventDetailsModal({
  event,
  canManage = false,
  onClose,
  onEdit,
}: EventDetailsModalProps) {
  const [mounted, setMounted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => setMounted(true), [])

  // Reset the inline delete confirm whenever a different event opens.
  useEffect(() => {
    if (event) {
      setConfirmingDelete(false)
      setIsDeleting(false)
    }
  }, [event])

  const handleClose = useCallback(() => {
    if (isDeleting) return
    onClose()
  }, [isDeleting, onClose])

  // Focus + Esc + body lock while open (DeleteArchiveModal precedent).
  useEffect(() => {
    if (!event || !mounted) return

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
  }, [event, mounted, handleClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) handleClose()
    },
    [handleClose],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!event || isDeleting) return
    const manualId = parseManualCalendarId(event)
    if (manualId == null) return
    setIsDeleting(true)
    try {
      const res = await deleteCalendarEvent(manualId)
      if (res.success) {
        toast.success(res.message || 'Calendar event deleted.')
        onClose()
        router.refresh()
      } else {
        toast.error(res.message || 'Failed to delete calendar event. Please try again.')
      }
    } catch {
      toast.error('Failed to delete calendar event. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [event, isDeleting, onClose, router])

  if (!mounted || !event) return null

  const isManual = event.kind === 'manual'
  const showManageActions = canManage && isManual
  const deepLinkLabel = DEEP_LINK_LABEL[event.kind]
  // Defense descriptions are stored as `Venue: …` by the feed reader.
  const venue =
    event.kind === 'defense' && event.description
      ? event.description.replace(/^Venue:\s*/, '')
      : null

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
        aria-labelledby="calendar-event-title"
        className="relative bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16),0_4px_16px_rgba(0,0,0,0.06)] border border-[#eceef8] w-full max-w-[480px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[24px] pt-[20px] pb-[14px] border-b border-[#f0f2fa] shrink-0 bg-white">
          <div className="flex items-start justify-between gap-[16px]">
            <div className="min-w-0">
              <h2
                id="calendar-event-title"
                className="font-heading font-bold text-[16px] leading-[24px] tracking-[-0.16px] text-[#10133a]"
              >
                Event Details
              </h2>
              <p className="font-sans font-medium text-[12.5px] leading-[18px] text-[#8a93b4] pt-[2px]">
                Full schedule information.
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              aria-label="Close event details"
              className="size-[30px] rounded-[10px] bg-[#fafbff] border border-[#eceef8] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]"
            >
              <X className="size-[14px] text-[#8a93b4]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] py-[20px] flex flex-col gap-[16px]">
          <DetailRow label="Title">
            <p className="font-sans font-bold text-[14px] leading-[20px] text-[#1e2145] break-words">
              {event.title}
            </p>
          </DetailRow>

          <DetailRow label="Date">
            <p className="font-sans font-medium text-[13px] leading-[19px] text-[#5a6382] flex items-center gap-[8px]">
              <CalendarDays className="size-[14px] text-[#9ea8c6] shrink-0" strokeWidth={2} />
              {formatEventSpan(event.start, event.end, event.allDay)}
            </p>
          </DetailRow>

          {event.kind === 'defense' ? (
            <DetailRow label="Venue">
              <p className="font-sans font-medium text-[13px] leading-[19px] text-[#5a6382] flex items-center gap-[8px]">
                <MapPin className="size-[14px] text-[#9ea8c6] shrink-0" strokeWidth={2} />
                {venue && venue.length > 0 ? venue : 'No venue listed.'}
              </p>
            </DetailRow>
          ) : (
            <DetailRow label="Description">
              <p className="font-sans font-medium text-[13px] leading-[19px] text-[#5a6382] whitespace-pre-wrap break-words">
                {event.description && event.description.length > 0
                  ? event.description
                  : 'No description provided.'}
              </p>
            </DetailRow>
          )}

          {event.groupName ? (
            <DetailRow label="Group">
              <p className="font-sans font-semibold text-[13px] leading-[19px] text-[#1e2145]">
                {event.groupName}
              </p>
            </DetailRow>
          ) : null}

          {event.kind === 'manual' ? (
            <DetailRow label="Audience">
              <p className="font-sans font-semibold text-[13px] leading-[19px] text-[#1e2145]">
                {getAudienceLabel(event.audience)}
              </p>
            </DetailRow>
          ) : event.sectionName ? (
            <DetailRow label="Section">
              <p className="font-sans font-semibold text-[13px] leading-[19px] text-[#1e2145]">
                {event.sectionName}
              </p>
            </DetailRow>
          ) : null}

          {confirmingDelete ? (
            <div
              role="alert"
              className="rounded-[10px] border border-[rgba(225,29,72,0.2)] bg-[rgba(225,29,72,0.07)] px-[14px] py-[10px] flex items-start gap-[10px]"
            >
              <TriangleAlert className="size-[16px] text-[#e11d48] shrink-0 mt-[1px]" strokeWidth={2} />
              <p className="font-sans font-medium text-[12.5px] leading-[18px] text-[#e11d48]">
                Delete this event? This cannot be undone.
              </p>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#f0f2fa] bg-white px-[24px] py-[16px] shrink-0 flex items-center justify-end gap-[10px] flex-wrap">
          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                aria-label="Confirm delete calendar event"
                className="inline-flex items-center justify-center gap-[8px] h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(225,29,72,0.32)] bg-[#e11d48] hover:bg-[#be123c] active:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(225,29,72,0.3)] min-w-[120px]"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-[14px] animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </>
          ) : (
            <>
              {showManageActions ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    aria-label="Delete calendar event"
                    className="inline-flex items-center justify-center gap-[6px] h-[36px] px-[14px] rounded-[9px] bg-white border border-[#fecdd3] font-sans font-semibold text-[13px] leading-none text-[#e11d48] hover:bg-[#fff1f2] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(225,29,72,0.15)]"
                  >
                    <Trash2 className="size-[14px]" strokeWidth={2} />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit?.(event)}
                    aria-label="Edit calendar event"
                    className="inline-flex items-center justify-center gap-[6px] h-[36px] px-[14px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
                  >
                    <Pencil className="size-[14px]" strokeWidth={2} />
                    Edit
                  </button>
                </>
              ) : null}
              {deepLinkLabel ? (
                <a
                  href={event.href}
                  aria-label={deepLinkLabel}
                  className="inline-flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] bg-gradient-to-r from-[#707dff] to-[#5565ff] border border-[rgba(112,125,255,0.2)] hover:opacity-95 active:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)]"
                >
                  {deepLinkLabel}
                  <ExternalLink className="size-[14px]" strokeWidth={2} />
                </a>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                disabled={isDeleting}
                className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors disabled:opacity-60"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, globalThis.document.body)
}

export default EventDetailsModal
