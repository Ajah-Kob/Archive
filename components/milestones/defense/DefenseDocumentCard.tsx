'use client'

import { createContext, use, useRef, useState } from 'react'
import {
  Clock,
  Eye,
  FileText,
  Loader2,
  TriangleAlert,
  UploadCloud,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { put as blobPut } from '@vercel/blob/client'
import { SubmitDocumentConfirmModal } from './SubmitDocumentConfirmModal'
import { ReplaceDocumentModal } from './ReplaceDocumentModal'

// ── Types ────────────────────────────────────────────────────────────────────

/** Defense verdict on the initial document (comes from DefenseSchedule.verdict). */
export type InitialDocumentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'MINOR_REVISION'
  | 'MAJOR_REVISION'
  | 'REJECTED'

/** Review-derived status on a resubmitted document. */
export type ResubmissionStatus = 'IN_REVIEW' | 'APPROVED' | 'REJECTED'

export interface DefenseDocumentInfo {
  fileName: string
  size: number
  submittedAt: string
  blobUrl: string
  submittedByName: string
  /** Submission version — only set for resubmissions (v2, v3, ...). */
  version?: number
}

/** Actions required from the parent page / server actions. */
export interface DefenseUploadActions {
  requestUploadToken: (
    fileName: string,
  ) => Promise<{
    success: boolean
    message: string
    payload?: { pathname: string; token: string } | null
  }>
  submitDocument: (data: {
    blobUrl: string
    fileName: string
    size: number
  }) => Promise<{ success: boolean; message: string }>
  resubmitDocument: (data: {
    blobUrl: string
    fileName: string
    size: number
  }) => Promise<{ success: boolean; message: string }>
  replaceDocument: (data: {
    blobUrl: string
    fileName: string
    size: number
  }) => Promise<{ success: boolean; message: string }>
}

interface DefenseDocumentCardContextValue {
  initial: DefenseDocumentInfo | null
  initialStatus: InitialDocumentStatus | null
  resubmission: DefenseDocumentInfo | null
  resubmissionStatus: ResubmissionStatus | null
  canResubmit: boolean
  onSubmitted: () => void
  actions: DefenseUploadActions
}

// ── Context ──────────────────────────────────────────────────────────────────

const DefenseDocumentCardContext =
  createContext<DefenseDocumentCardContextValue | null>(null)

function useDefenseDocumentCard() {
  const ctx = use(DefenseDocumentCardContext)
  if (!ctx) {
    throw new Error(
      'DefenseDocumentCard subcomponents must be rendered within DefenseDocumentCard',
    )
  }
  return ctx
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 20 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function validateFile(file: File | null): string | null {
  if (!file) return 'Please choose a file first.'
  if (file.type !== 'application/pdf') return 'Please choose a PDF file.'
  if (file.size > MAX_SIZE_BYTES)
    return 'File is too large. Maximum size is 20 MB.'
  return null
}

// ── Status metadata ──────────────────────────────────────────────────────────

/** Circle history state — 15px status dot (Figma 1448-7156). */
const CIRCLE_STYLES: Record<string, string> = {
  NO_VERDICT: 'bg-[#e0e3f0] border-[#cdd3ea] rounded-[25px]',
  APPROVED: 'bg-[#16a34a] border-[#cfebd6] rounded-[25px]',
  MINOR_REVISION: 'bg-[#f59e0b] border-[#f2ddba] rounded-[50px]',
  MAJOR_REVISION: 'bg-[#e1681d] border-[#ffd1b4] rounded-[50px]',
  REJECTED: 'bg-[#e11d48] border-[#efd5da] rounded-[25px]',
  IN_REVIEW: 'bg-[#f59e0b] border-[#f2ddba] rounded-[50px]',
}

/** Status pill (Figma 1448-7141). */
const PILL_STYLES: Record<string, { label: string; className: string }> = {
  APPROVED: {
    label: 'Approved',
    className:
      'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
  },
  MINOR_REVISION: {
    label: 'Minor Revision',
    className:
      'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  },
  MAJOR_REVISION: {
    label: 'Major Revision',
    className:
      'bg-[rgba(225,104,29,0.07)] border-[rgba(225,104,29,0.2)] text-[#e1681d]',
  },
  REJECTED: {
    label: 'Rejected',
    className:
      'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)] text-[#e11d48]',
  },
  IN_REVIEW: {
    label: 'For Review',
    className:
      'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  },
}

// ── Draft upload state ───────────────────────────────────────────────────────

interface DraftUpload {
  file: File
  status: 'uploading' | 'ready' | 'error'
  progress: number
  blobUrl?: string
}

// ── Compound subcomponents ───────────────────────────────────────────────────

/** Card frame — outer container matching existing card styles. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      {children}
    </div>
  )
}

/** Card header with "Defense Document" label. */
function Header() {
  return (
    <div className="flex items-center gap-[8px] px-[16px] pt-[12px] pb-[13px] border-b border-[#f0f2fa]">
      <div className="flex size-[26px] items-center justify-center rounded-[7px] bg-[rgba(112,125,255,0.05)] shrink-0">
        <FileText className="size-[12px] text-[#707dff]" strokeWidth={2} />
      </div>
      <p className="font-sora text-[12px] font-bold text-[#1e3a8a] tracking-[-0.12px]">
        Defense Document
      </p>
    </div>
  )
}

/** Circle history state — 15px status dot. */
export function CircleHistoryState({ state }: { state: string }) {
  return (
    <span
      className={`size-[15px] border-2 border-solid shrink-0 ${CIRCLE_STYLES[state] ?? CIRCLE_STYLES.NO_VERDICT}`}
    />
  )
}

/** Status pill — colored label for a document's verdict/review state. */
export function StatusPill({ state }: { state: string }) {
  const meta = PILL_STYLES[state]
  if (!meta) return null
  return (
    <span
      className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] font-sans font-bold text-[11px] leading-[16.5px] whitespace-nowrap ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

/** Small secondary button (View / Replace) used in document rows. */
function GhostButton({
  icon,
  children,
  onClick,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[5px] h-[32px] px-[13px] py-[6px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0"
    >
      {icon}
      {children}
    </button>
  )
}

/** Status line under a document's meta (e.g. "Wait for your defense schedule..."). */
function StatusLine({
  tone,
  children,
}: {
  tone: 'amber' | 'muted'
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-[5px] py-[3px]">
      {tone === 'amber' && (
        <Clock className="size-[9px] text-[#f59e0b]" strokeWidth={2.5} />
      )}
      <p
        className={`font-sans font-medium text-[12px] leading-[18px] whitespace-nowrap ${
          tone === 'amber' ? 'text-[#f59e0b]' : 'text-[#9ea8c6]'
        }`}
      >
        {children}
      </p>
    </div>
  )
}

/**
 * Document row — renders a single submitted document in the timeline.
 * Initial documents show the defense verdict status; resubmitted documents
 * show the review-derived status. Matches Figma 1448-7043 (initial) and
 * 1448-7162 (resubmitted).
 *
 * Replacing a document opens a modal with an upload zone; the replacement is
 * only applied once the user confirms inside the modal.
 */
function DocumentRow({
  document,
  status,
  versionLabel,
  showConnector,
  connectorDashed,
  showReplace,
}: {
  document: DefenseDocumentInfo
  status: string
  versionLabel?: string
  showConnector?: boolean
  connectorDashed?: boolean
  showReplace?: boolean
}) {
  const { actions, onSubmitted } = useDefenseDocumentCard()
  const [replaceOpen, setReplaceOpen] = useState(false)

  const isNoVerdict = status === 'PENDING'
  const isInReview = status === 'IN_REVIEW'

  const meta = versionLabel
    ? `${versionLabel} · ${formatDate(document.submittedAt)} · Submitted by ${document.submittedByName}`
    : `PDF · ${formatSize(document.size)} · ${formatDate(document.submittedAt)} · Submitted by ${document.submittedByName}`

  return (
    <div className="flex gap-[14px] items-start">
      {/* Timeline rail: status circle + optional connector line */}
      <div className="flex flex-col items-center self-stretch shrink-0 pt-[2px]">
        <CircleHistoryState state={status} />
        {showConnector && (
          <span
            className={`w-[2px] flex-1 min-h-[24px] ${
              connectorDashed
                ? 'border-l border-dashed border-[#e8ebf8]'
                : 'bg-[#e8ebf8]'
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-start gap-[12px]">
        <div className="flex-1 min-w-0 flex flex-col items-start">
          {/* Title + status pill */}
          <div className="flex items-center gap-[8px] min-w-0">
            <h4 className="font-sora font-bold text-[13px] leading-[normal] text-[#1e3a8a] truncate">
              {document.fileName}
            </h4>
            {!isNoVerdict && <StatusPill state={status} />}
          </div>

          {/* Meta line */}
          <p className="pt-[4px] font-sans font-medium text-[12px] leading-[18px] text-[#6b7399] truncate">
            {meta}
          </p>

          {/* Status line */}
          {isNoVerdict && (
            <StatusLine tone="amber">
              Wait for your defense schedule and verdict
            </StatusLine>
          )}
          {isInReview && (
            <StatusLine tone="amber">Waiting for panelist approvals</StatusLine>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-start gap-[10px] shrink-0">
          <GhostButton icon={<Eye className="size-[11px]" />}>View</GhostButton>
          {showReplace && (
            <GhostButton onClick={() => setReplaceOpen(true)}>
              Replace
            </GhostButton>
          )}
        </div>
      </div>

      {replaceOpen && (
        <ReplaceDocumentModal
          document={document}
          actions={actions}
          onClose={() => setReplaceOpen(false)}
          onReplaced={() => {
            setReplaceOpen(false)
            onSubmitted()
          }}
        />
      )}
    </div>
  )
}

/**
 * Upload zone — handles both the idle drag-drop state and the uploaded
 * (draft, not-yet-submitted) state. Matches Figma 1413-6563 (idle) and
 * 1413-6592 (uploaded).
 */
function UploadZone({ mode }: { mode?: 'initial' | 'resubmit' }) {
  const { initial, actions, canResubmit, onSubmitted } =
    useDefenseDocumentCard()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState<DraftUpload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isResubmitting = mode === 'resubmit' || (canResubmit && initial != null)

  const openPicker = () => inputRef.current?.click()

  async function startUpload(file: File) {
    setDraft({ file, status: 'uploading', progress: 0 })
    setError(null)

    const tokenRes = await actions.requestUploadToken(file.name)
    if (!tokenRes.success || !tokenRes.payload) {
      setDraft(null)
      setError(tokenRes.message)
      return
    }

    try {
      const blob = await blobPut(tokenRes.payload.pathname, file, {
        access: 'public',
        contentType: 'application/pdf',
        token: tokenRes.payload.token,
        onUploadProgress: (progress) => {
          const pct = Math.min(100, Math.round(progress.percentage))
          setDraft((d) => (d ? { ...d, progress: pct } : d))
        },
      })
      setDraft({ file, status: 'ready', progress: 100, blobUrl: blob.url })
    } catch (uploadError) {
      console.error('[DefenseUploadZone | Upload failed]:', uploadError)
      setDraft((d) => (d ? { ...d, status: 'error' } : null))
      setError('The upload failed. Please try again.')
    }
  }

  const acceptFile = (file: File | null) => {
    const validationError = validateFile(file)
    if (validationError) {
      setDraft(null)
      setError(validationError)
      return
    }
    void startUpload(file!)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    acceptFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    acceptFile(e.dataTransfer.files?.[0] ?? null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleSurfaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  const handleRemove = () => {
    if (draft?.status === 'uploading') return
    setDraft(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Opens the confirmation modal instead of submitting directly.
  const handleSubmit = () => {
    if (
      !draft ||
      draft.status !== 'ready' ||
      !draft.blobUrl ||
      submitting
    ) {
      return
    }
    setConfirmOpen(true)
  }

  // Runs the actual submission once the user confirms in the modal.
  const confirmSubmit = async () => {
    if (
      !draft ||
      draft.status !== 'ready' ||
      !draft.blobUrl ||
      submitting
    ) {
      return
    }
    setSubmitting(true)
    setError(null)
    const res = isResubmitting
      ? await actions.resubmitDocument({
          blobUrl: draft.blobUrl,
          fileName: draft.file.name,
          size: draft.file.size,
        })
      : await actions.submitDocument({
          blobUrl: draft.blobUrl,
          fileName: draft.file.name,
          size: draft.file.size,
        })
    setSubmitting(false)
    if (!res.success) {
      setConfirmOpen(false)
      toast.error(res.message)
      return
    }
    toast.success(res.message)
    setConfirmOpen(false)
    setDraft(null)
    onSubmitted()
  }

  const isUploading = draft?.status === 'uploading'

  return (
    <div className="flex flex-col gap-[12px]">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        aria-label="Choose a defense document PDF to upload"
        onChange={handleFileSelect}
      />

      {draft ? (
        <>
          {/* Uploaded state (Figma 1413-6592) */}
          <div className="flex items-center gap-[11px] px-[14px] py-[12px] rounded-[10px] bg-[#fafbff] border border-[#eceef8]">
            <CircleHistoryState state="NO_VERDICT" />

            <div className="min-w-0 flex-1">
              <p className="truncate font-sora font-bold text-[13px] leading-[normal] text-[#1e3a8a]">
                {draft.file.name}
              </p>
              <p className="pt-[4px] font-sans font-medium text-[12px] leading-[18px] text-[#6b7399]">
                {isUploading
                  ? `Uploading… ${draft.progress}%`
                  : draft.status === 'error'
                    ? 'Upload failed'
                    : `PDF · ${formatSize(draft.file.size)} · Document Not Submitted`}
              </p>
            </div>

            <div className="flex items-center gap-[10px] shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={draft.status !== 'ready' || submitting}
                title={
                  draft.status !== 'ready'
                    ? 'Wait for the upload to finish'
                    : undefined
                }
                className="flex items-center gap-[5px] px-[16px] py-[8px] rounded-[9px] border border-[rgba(112,125,255,0.6)] text-white font-sans font-bold text-[12px] leading-[18px] drop-shadow-[0px_3px_4px_rgba(112,125,255,0.2)] transition-opacity hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                style={{
                  backgroundImage:
                    'linear-gradient(159deg, #707dff 0%, #5565ff 100%)',
                }}
              >
                {submitting ? (
                  <Loader2 className="size-[12px] animate-spin motion-reduce:animate-none" />
                ) : (
                  <UploadCloud className="size-[12px]" />
                )}
                Submit
              </button>
              <button
                type="button"
                onClick={openPicker}
                disabled={isUploading || submitting}
                className="flex items-center justify-center px-[12px] py-[8px] rounded-[9px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading || submitting}
                aria-label={`Remove ${draft.file.name}`}
                className="flex items-center gap-[5px] p-[5px] font-sans font-semibold text-[12px] text-[#ef4444] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <X className="size-[11px]" />
                Remove
              </button>
            </div>
          </div>

          {isUploading && (
            <div
              className="h-[4px] rounded-full bg-[#f0f2fa] overflow-hidden"
              role="progressbar"
              aria-valuenow={draft.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Uploading ${draft.file.name}`}
            >
              <div
                className="h-full rounded-full bg-[#707dff] transition-[width] duration-1000 motion-reduce:transition-none"
                style={{ width: `${Math.max(4, draft.progress)}%` }}
              />
            </div>
          )}

          {draft.status === 'ready' && !submitting && (
            <p className="font-sans font-medium text-[11.5px] leading-[18.4px] text-[#9ea8c6]">
              This document has not been submitted. Submit it when ready for
              panel review.
            </p>
          )}

          {draft.status === 'error' && (
            <button
              type="button"
              onClick={() => void startUpload(draft.file)}
              className="self-start font-sans font-semibold text-[11.5px] text-[#707dff] hover:text-[#5565ff] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none rounded"
            >
              Retry upload
            </button>
          )}
        </>
      ) : (
        <>
          {/* Idle state (Figma 1413-6563) */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload defense document"
            onClick={openPicker}
            onKeyDown={handleSurfaceKeyDown}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed bg-[#fafbff] px-[30px] py-[22px] text-center cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#707dff] ${
              isDragging
                ? 'border-[#707dff] bg-[#f8f9ff]'
                : 'border-[#d0d5ea] hover:border-[#707dff]'
            }`}
          >
            <div className="flex size-[48px] items-center justify-center rounded-[24px] bg-[#eef0fb]">
              <UploadCloud className="size-[20px] text-[#707dff]" strokeWidth={1.75} />
            </div>
            <p className="pt-[14px] font-sora text-[14px] font-bold text-[#1e3a8a]">
              Drag and drop your document here
            </p>
            <div className="flex items-center gap-[7px] pt-[6px]">
              <span className="font-sans font-medium text-[12.5px] text-[#8a93b4]">
                or
              </span>
              <button
                type="button"
                onClick={openPicker}
                className="flex items-center gap-[7px] px-[20px] py-[9px] rounded-[9px] text-white font-sans font-bold text-[12.5px] drop-shadow-[0px_4px_6px_rgba(112,125,255,0.21)] transition-opacity hover:opacity-95"
                style={{
                  backgroundImage:
                    'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
                }}
              >
                <UploadCloud className="size-[12px]" />
                Browse Files
              </button>
            </div>
            <p className="pt-[10px] font-sans font-medium text-[11px] text-[#bbc0d8]">
              PDF only · Maximum file size: 20 MB
            </p>
          </div>

          {error && (
            <div className="flex gap-[6px] items-start">
              <TriangleAlert className="size-[13px] text-[#e11d48] shrink-0 mt-px" />
              <p className="font-medium text-[12px] leading-[17.4px] text-[#e11d48]">
                {error}
              </p>
            </div>
          )}

          {isResubmitting && initial && (
            <p className="font-sans font-medium text-[11px] text-[#9ea8c6]">
              Current version: {initial.fileName}
            </p>
          )}
        </>
      )}

      {confirmOpen && draft && (
        <SubmitDocumentConfirmModal
          mode="submit"
          fileName={draft.file.name}
          busy={submitting}
          onConfirm={() => void confirmSubmit()}
          onClose={() => {
            if (!submitting) setConfirmOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ── Root component ───────────────────────────────────────────────────────────

interface DefenseDocumentCardProps {
  initial: DefenseDocumentInfo | null
  initialStatus: InitialDocumentStatus | null
  resubmission: DefenseDocumentInfo | null
  resubmissionStatus: ResubmissionStatus | null
  canResubmit: boolean
  onSubmitted: () => void
  actions: DefenseUploadActions
}

/**
 * Defense Document Card — compound component for the student defense milestone.
 *
 * Displays the initial defense document and any resubmissions in a timeline
 * layout, plus an upload zone for the idle and uploaded (draft) states.
 *
 * **Design refs:** Figma 1413-6563 (idle), 1413-6592 (uploaded),
 * 1413-6628 (submitted), 1448-7043 (initial states), 1448-7162 (resubmitted
 * states), 1448-7141 (status pill), 1448-7156 (circle history state).
 * **Out of scope:** PDF viewer and review link (separate task).
 */
export function DefenseDocumentCard({
  initial,
  initialStatus,
  resubmission,
  resubmissionStatus,
  canResubmit,
  onSubmitted,
  actions,
}: DefenseDocumentCardProps) {
  const showUpload = initial == null || (canResubmit && resubmission == null)
  const showResubmitUpload = canResubmit && initial != null && resubmission == null

  return (
    <DefenseDocumentCardContext.Provider
      value={{
        initial,
        initialStatus,
        resubmission,
        resubmissionStatus,
        canResubmit,
        onSubmitted,
        actions,
      }}
    >
      <Frame>
        <Header />
        <div className="p-[14px] flex flex-col gap-[14px]">
          {/* Timeline of submitted documents */}
          {initial && initialStatus && (
            <div className="flex flex-col">
              <DocumentRow
                document={initial}
                status={initialStatus}
                showConnector={resubmission != null}
                showReplace={initialStatus === 'PENDING'}
              />
              {resubmission && resubmissionStatus && (
                <DocumentRow
                  document={resubmission}
                  status={resubmissionStatus}
                  versionLabel={`v${resubmission.version ?? 2}`}
                  connectorDashed={resubmissionStatus === 'IN_REVIEW'}
                />
              )}            </div>
          )}

          {/* Upload zone: shown when no document exists or resubmission needed */}
          {showUpload && <UploadZone mode={showResubmitUpload ? 'resubmit' : 'initial'} />}

          {/* Empty state — no document and upload not possible */}
          {!initial && !showUpload && (
            <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
              No document has been submitted for this defense yet.
            </p>
          )}
        </div>
      </Frame>
    </DefenseDocumentCardContext.Provider>
  )
}
