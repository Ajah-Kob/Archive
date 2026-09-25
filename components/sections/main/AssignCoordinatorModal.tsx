'use client'

// ─── AssignCoordinatorModal ──────────────────────────────────────────────────
// Shared manager flow for assigning or replacing a section coordinator.
//
// The explicit `mode` keeps the two contracts self-documenting:
// - `assign` starts with no selection and uses the one-time assignment action.
// - `edit` receives the observed current coordinator id, preselects that
//   active option, labels it `Current`, and requires a different selection.
// - Both variants share the same loading, retry, empty roster, dismissal,
//   toast, refresh, and inline-error behavior.
// - There is intentionally no coordinator-removal path.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Loader2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { UserProfile } from '@/components/ui/UserProfile'
import { getInitials } from '@/lib/helper'
import {
  getActiveCoordinators,
  type ActiveCoordinatorOption,
} from '@/lib/actions/coordinator'
import {
  assignSectionCoordinator,
  reassignSectionCoordinator,
} from '@/lib/actions/sections'

export interface AssignSectionRef {
  id: number
  name: string
  academicYear?: string
}

type CoordinatorModalMode = 'assign' | 'edit'

type CoordinatorModalVariant =
  | { mode: 'assign'; currentCoordinatorId?: never }
  | { mode: 'edit'; currentCoordinatorId: number }

type AssignCoordinatorModalProps = CoordinatorModalVariant & {
  section: AssignSectionRef | null
  onClose: () => void
  onSuccess: () => void
}

type AssignCoordinatorModalBodyProps = CoordinatorModalVariant & {
  section: AssignSectionRef
  onClose: () => void
  onSuccess: () => void
}

type CoordinatorActionResponse = {
  success: boolean
  message: string
}

const COORDINATORS_HREF = '/faculty/faculty-management/coordinators'

const MODAL_COPY: Record<
  CoordinatorModalMode,
  {
    title: string
    cta: string
    closeAriaLabel: string
    failureMessage: string
  }
> = {
  assign: {
    title: 'Assign Coordinator',
    cta: 'Assign Coordinator',
    closeAriaLabel: 'Close assign coordinator dialog',
    failureMessage: 'Failed to assign coordinator.',
  },
  edit: {
    title: 'Edit Coordinator',
    cta: 'Edit Coordinator',
    closeAriaLabel: 'Close edit coordinator dialog',
    failureMessage: 'Failed to reassign coordinator.',
  },
}

function AssignCoordinatorModalBody({
  section,
  mode,
  currentCoordinatorId,
  onClose,
  onSuccess,
}: AssignCoordinatorModalBodyProps) {
  const copy = MODAL_COPY[mode]
  const expectedCoordinatorId =
    mode === 'edit' ? currentCoordinatorId : null
  const [coordinators, setCoordinators] = useState<ActiveCoordinatorOption[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(
    expectedCoordinatorId,
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const sectionId = section.id

  useEffect(() => {
    let cancelled = false
    getActiveCoordinators()
      .then((res) => {
        if (cancelled) return
        if (res.success && Array.isArray(res.payload)) {
          setCoordinators(res.payload)
          if (expectedCoordinatorId !== null) {
            const currentIsAvailable = res.payload.some(
              (coordinator) => coordinator.id === expectedCoordinatorId,
            )
            if (!currentIsAvailable) setSelectedId(null)
          }
        } else {
          setCoordinators([])
          setLoadError(res.message || 'Failed to fetch coordinators.')
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setCoordinators([])
        setLoadError('Failed to fetch coordinators.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [expectedCoordinatorId, reloadKey, sectionId])

  useEffect(() => {
    if (closeRef.current) closeRef.current.focus()
  }, [sectionId])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, submitting])

  function handleRetry() {
    setLoading(true)
    setLoadError(null)
    setSelectedId(expectedCoordinatorId)
    setSubmitError(null)
    setReloadKey((key) => key + 1)
  }

  const selectedCoordinator = coordinators.find(
    (coordinator) => coordinator.id === selectedId,
  )
  const hasDifferentActiveSelection =
    expectedCoordinatorId === null || selectedId !== expectedCoordinatorId
  const showEmpty = !loading && !loadError && coordinators.length === 0
  const canSubmit =
    selectedCoordinator !== undefined &&
    hasDifferentActiveSelection &&
    !loading &&
    !showEmpty &&
    !submitting

  async function handleSubmit() {
    if (selectedId === null || submitting || !canSubmit) return

    setSubmitting(true)
    setSubmitError(null)

    let result: CoordinatorActionResponse
    try {
      if (mode === 'edit') {
        result = await reassignSectionCoordinator(
          section.id,
          selectedId,
          currentCoordinatorId,
        )
      } else {
        result = await assignSectionCoordinator(section.id, selectedId)
      }
    } catch {
      setSubmitting(false)
      setSubmitError(copy.failureMessage)
      toast.error(copy.failureMessage)
      return
    }

    setSubmitting(false)
    if (result.success) {
      toast.success(result.message)
      onSuccess()
      onClose()
    } else {
      setSubmitError(result.message)
      toast.error(result.message)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,18,40,0.45)] backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!submitting) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coordinator-modal-title"
        className="bg-white w-full sm:w-[460px] max-w-full max-h-[90vh] flex flex-col rounded-[16px] shadow-[0px_24px_64px_0px_rgba(30,58,138,0.18),0px_4px_16px_0px_rgba(0,0,0,0.08)] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[22px] pt-[18px] pb-[19px] border-b border-[#f0f2fa]">
          <div className="flex gap-[10px] items-center min-w-0">
            <div className="size-[30px] rounded-[8px] bg-[rgba(112,125,255,0.05)] flex items-center justify-center shrink-0">
              <UserPlus className="size-[14px] text-[#707dff]" />
            </div>
            <div className="min-w-0">
              <h2
                id="coordinator-modal-title"
                className="font-['Sora',sans-serif] font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]"
              >
                {copy.title}
              </h2>
              <p className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4] truncate">
                {section.name}
                {section.academicYear ? ` · ${section.academicYear}` : ''}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={copy.closeAriaLabel}
            className="size-[28px] rounded-[7px] bg-[#f4f5fc] border border-[#e8ebf8] flex items-center justify-center cursor-pointer hover:bg-[#eef0fb] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <div
          className="flex flex-col px-[22px] py-[18px] gap-[10px] overflow-y-auto min-h-0"
          role="radiogroup"
          aria-label="Active coordinators"
          aria-busy={loading}
        >
          {loading ? (
            <div role="status" aria-label="Loading coordinators">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="w-full h-[56px] rounded-xl bg-[#eef0fb] animate-pulse"
                />
              ))}
            </div>
          ) : null}

          {!loading && loadError ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p
                role="alert"
                className="font-sans font-medium text-[13px] leading-[19.5px] text-[#ef4444]"
              >
                {loadError}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="px-[21px] py-[10px] rounded-[10px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] leading-[19.5px] text-[#5a6382] cursor-pointer hover:bg-[#fafbff] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : null}

          {showEmpty ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="font-sans font-medium text-[13px] leading-[19.5px] text-[#8a93b4]">
                No active coordinators available
              </p>
              <Link
                href={COORDINATORS_HREF}
                className="font-sans font-bold text-[13px] leading-[19.5px] text-[#707dff] underline underline-offset-2 hover:text-[#5565ff] transition-colors"
              >
                Go to coordinator management
              </Link>
            </div>
          ) : null}

          {!loading && !loadError && coordinators.length > 0
            ? coordinators.map((coordinator) => {
                const selected = selectedId === coordinator.id
                const current =
                  expectedCoordinatorId !== null &&
                  coordinator.id === expectedCoordinatorId
                return (
                  <label
                    key={coordinator.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors min-h-[56px] ${
                      selected
                        ? 'bg-[#f4f6ff] border-[#707dff]'
                        : 'bg-[#fafbff] border-[#e8ebf8] hover:bg-[#f4f6ff]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="coordinator"
                      value={coordinator.id}
                      checked={selected}
                      onChange={() => {
                        setSelectedId(coordinator.id)
                        setSubmitError(null)
                      }}
                      className="sr-only"
                    />
                    <span className="min-w-0 flex-1">
                      <UserProfile
                        initials={getInitials(coordinator.name)}
                        name={coordinator.name}
                        email={coordinator.email}
                        gradient={coordinator.avatarGradient}
                      />
                    </span>
                    <span className="flex items-center gap-[6px] px-[10px] py-[4px] bg-[#f0f2fa] border border-[#e8ebf8] rounded-[20px] shrink-0">
                      {current ? (
                        <span className="font-['Plus_Jakarta_Sans'] font-bold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
                          Current
                        </span>
                      ) : null}
                      <span className="font-['Plus_Jakarta_Sans'] font-bold text-[11px] leading-[16.5px] text-[#6b7399] whitespace-nowrap">
                        {coordinator.sectionsManaged}{' '}
                        {coordinator.sectionsManaged === 1
                          ? 'Section'
                          : 'Sections'}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`size-[18px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? 'border-[#707dff]' : 'border-[#dfe3fb]'
                      }`}
                    >
                      {selected ? (
                        <span className="size-[8px] rounded-full bg-[#707dff]" />
                      ) : null}
                    </span>
                  </label>
                )
              })
            : null}

          {submitError ? (
            <p
              role="alert"
              aria-live="polite"
              className="w-full font-sans font-medium text-[12.5px] leading-[19px] text-[#ef4444]"
            >
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-[10px] px-[22px] pt-[17px] pb-[16px] border-t border-[#f0f2fa]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-[21px] py-[10px] rounded-[10px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] leading-[19.5px] text-[#5a6382] cursor-pointer hover:bg-[#fafbff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 px-[20px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
            style={{
              backgroundImage:
                'linear-gradient(163.7deg, rgb(112, 125, 255) 0%, rgb(85, 101, 255) 100%)',
              boxShadow: '0px 4px 6px rgba(112,125,255,0.25)',
            }}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {copy.cta}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function AssignCoordinatorModal(props: AssignCoordinatorModalProps) {
  const { section } = props
  if (!section) return null

  if (props.mode === 'edit') {
    return (
      <AssignCoordinatorModalBody
        key={`${section.id}-${props.mode}-${props.currentCoordinatorId}`}
        section={section}
        mode="edit"
        currentCoordinatorId={props.currentCoordinatorId}
        onClose={props.onClose}
        onSuccess={props.onSuccess}
      />
    )
  }

  return (
    <AssignCoordinatorModalBody
      key={`${section.id}-${props.mode}`}
      section={section}
      mode="assign"
      onClose={props.onClose}
      onSuccess={props.onSuccess}
    />
  )
}
