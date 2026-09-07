'use client'

import { useState, useCallback } from 'react'
import { FileText, Info } from 'lucide-react'
import { ResearchTitleInput } from './fields/ResearchTitleInput'
import { AbstractTextarea } from './fields/AbstractTextarea'
import { TagChipInput } from './fields/TagChipInput'
import { AuthorList } from './fields/AuthorList'
import {
  UploadDocument,
  type UploadDocumentValue,
} from './fields/UploadDocument'
import { FooterActions } from './FooterActions'
import type { AuthorEntry } from '@/lib/archiving/validation'
import type { ArchivingUiStatus } from '@/lib/actions/archiving'

interface FieldErrors {
  title?: string | null
  abstract?: string | null
  tags?: string | null
  authors?: string | null
  document?: string | null
}

interface CapstoneDetailsCardProps {
  isReadOnly?: boolean
  status?: ArchivingUiStatus
  /** Controlled title — when provided, component is controlled from parent (ArchivingView) */
  title?: string
  onTitleChange?: (value: string) => void
  /** Controlled abstract — when provided, component is controlled from parent */
  abstract?: string
  onAbstractChange?: (value: string) => void
  /** Controlled tags */
  tags?: string[]
  onTagsChange?: (value: string[]) => void
  /** Controlled authors — ordered, preserves linked vs custom distinction */
  authors?: AuthorEntry[]
  onAuthorsChange?: (value: AuthorEntry[]) => void
  /** Explicit reorder callback — order persisted JSON used for preview/submitted/repo */
  onAuthorsReorder?: (value: AuthorEntry[]) => void
  /** Controlled document — blob reference persisted in ArchivingSubmission */
  document?: UploadDocumentValue | null
  onDocumentChange?: (value: UploadDocumentValue | null) => void
  documentError?: string
  fieldErrors?: FieldErrors
  submittedByName?: string | null
  submittedAt?: string | null
  /** Footer wiring — subtask 08 */
  onPreview?: () => void
  onSaveDraft?: () => void
  onSubmit?: () => void
  isSubmitDisabled?: boolean
  submitDisabledReason?: string
  isSubmitting?: boolean
  isSavingDraft?: boolean
  isSaveDraftDisabled?: boolean
  /** Seed values for uncontrolled mode (e.g., draft recovered from DB) */
  initialTitle?: string | null
  initialAbstract?: string | null
  initialTags?: string[] | null
  initialAuthors?: AuthorEntry[] | null
  initialDocument?: UploadDocumentValue | null
}

function Header() {
  return (
    <div className="flex items-center gap-[10px] px-[30px] py-[14px] border-b border-[#f0f2fa] shrink-0">
      <div className="size-[26px] rounded-[8px] bg-[rgba(112,125,255,0.05)] border border-[rgba(112,125,255,0.08)] flex items-center justify-center shrink-0">
        <FileText className="size-[13px] text-[#707dff]" strokeWidth={2} />
      </div>
      <h3 className="font-heading font-bold text-[12px] leading-[18px] tracking-[0.24px] text-[#1e3a8a]">
        Capstone Details
      </h3>
    </div>
  )
}

function InfoCallout() {
  return (
    <div className="flex items-start gap-[10px] rounded-[10px] border border-[#e0e3f0] bg-[#f8f9ff] px-[14px] py-[10px]">
      <Info
        className="size-[16px] text-[#707dff] shrink-0 mt-[1px]"
        strokeWidth={2}
      />
      <p className="font-sans text-[12.5px] leading-[18px] text-[#5a6382]">
        Once submitted, your capstone details cannot be changed.
      </p>
    </div>
  )
}

function LockedBanner({ status }: { status?: ArchivingUiStatus }) {
  const isArchived = status === 'CAPSTONE_ARCHIVED'
  if (isArchived) {
    return (
      <div className="flex items-start gap-[10px] rounded-[10px] border border-[rgba(22,163,74,0.2)] bg-[#ecfaf5] px-[14px] py-[10px]">
        <Info
          className="size-[16px] text-[#16a34a] shrink-0 mt-[1px]"
          strokeWidth={2}
        />
        <p className="font-sans text-[12.5px] leading-[18px] text-[#065f46]">
          Submission is locked — awaiting Program Chair approval
        </p>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-[10px] rounded-[10px] border border-[#f59e0b] bg-[#fffbeb] px-[14px] py-[10px]">
      <Info
        className="size-[16px] text-[#f59e0b] shrink-0 mt-[1px]"
        strokeWidth={2}
      />
      <p className="font-sans text-[12.5px] leading-[18px] text-[#92400e]">
        Submission is locked — awaiting Program Chair approval
      </p>
    </div>
  )
}

export function CapstoneDetailsCard({
  isReadOnly = false,
  status,
  title: controlledTitle,
  onTitleChange: controlledOnTitleChange,
  abstract: controlledAbstract,
  onAbstractChange: controlledOnAbstractChange,
  tags: controlledTags,
  onTagsChange: controlledOnTagsChange,
  authors: controlledAuthors,
  onAuthorsChange: controlledOnAuthorsChange,
  onAuthorsReorder,
  document: controlledDocument,
  onDocumentChange: controlledOnDocumentChange,
  documentError,
  fieldErrors,
  submittedByName,
  submittedAt,
  onPreview,
  onSaveDraft,
  onSubmit,
  isSubmitDisabled,
  submitDisabledReason,
  isSubmitting,
  isSavingDraft,
  isSaveDraftDisabled,
  initialTitle,
  initialAbstract,
  initialTags,
  initialAuthors,
  initialDocument,
}: CapstoneDetailsCardProps) {
  // Uncontrolled fallback — seeded from initialTitle/initialAbstract or controlled fallback.
  // Keeps component usable both as controlled (ArchivingView drives state) and uncontrolled (standalone preview).
  const [internalTitle, setInternalTitle] = useState<string>(
    controlledTitle ?? initialTitle ?? '',
  )
  const [internalAbstract, setInternalAbstract] = useState<string>(
    controlledAbstract ?? initialAbstract ?? '',
  )
  const [internalTags, setInternalTags] = useState<string[]>(
    controlledTags ?? initialTags ?? [],
  )
  const [internalAuthors, setInternalAuthors] = useState<AuthorEntry[]>(
    controlledAuthors ?? initialAuthors ?? [],
  )
  const [internalDocument, setInternalDocument] =
    useState<UploadDocumentValue | null>(
      controlledDocument ?? initialDocument ?? null,
    )

  const isTitleControlled = controlledTitle !== undefined
  const isAbstractControlled = controlledAbstract !== undefined
  const isTagsControlled = controlledTags !== undefined
  const isAuthorsControlled = controlledAuthors !== undefined
  const isDocumentControlled = controlledDocument !== undefined

  const effectiveTitle = isTitleControlled
    ? (controlledTitle as string)
    : internalTitle
  const effectiveAbstract = isAbstractControlled
    ? (controlledAbstract as string)
    : internalAbstract
  const effectiveTags = isTagsControlled
    ? (controlledTags as string[])
    : internalTags
  const effectiveAuthors = isAuthorsControlled
    ? (controlledAuthors as AuthorEntry[])
    : internalAuthors
  const effectiveDocument = isDocumentControlled
    ? (controlledDocument as UploadDocumentValue | null)
    : internalDocument

  const handleTitleChange = useCallback(
    (next: string) => {
      if (isTitleControlled && controlledOnTitleChange) {
        controlledOnTitleChange(next)
      } else {
        setInternalTitle(next)
        controlledOnTitleChange?.(next)
      }
    },
    [isTitleControlled, controlledOnTitleChange],
  )

  const handleAbstractChange = useCallback(
    (next: string) => {
      if (isAbstractControlled && controlledOnAbstractChange) {
        controlledOnAbstractChange(next)
      } else {
        setInternalAbstract(next)
        controlledOnAbstractChange?.(next)
      }
    },
    [isAbstractControlled, controlledOnAbstractChange],
  )

  const handleTagsChange = useCallback(
    (next: string[]) => {
      if (isTagsControlled && controlledOnTagsChange) {
        controlledOnTagsChange(next)
      } else {
        setInternalTags(next)
        controlledOnTagsChange?.(next)
      }
    },
    [isTagsControlled, controlledOnTagsChange],
  )

  const handleAuthorsChange = useCallback(
    (next: AuthorEntry[]) => {
      if (isAuthorsControlled && controlledOnAuthorsChange) {
        controlledOnAuthorsChange(next)
      } else {
        setInternalAuthors(next)
        controlledOnAuthorsChange?.(next)
      }
      onAuthorsReorder?.(next)
    },
    [isAuthorsControlled, controlledOnAuthorsChange, onAuthorsReorder],
  )

  const handleAuthorsReorder = useCallback(
    (next: AuthorEntry[]) => {
      // Drag reorder updates persisted authorOrder JSON; same as change but explicit for acceptance criteria
      handleAuthorsChange(next)
    },
    [handleAuthorsChange],
  )

  const handleDocumentChange = useCallback(
    (next: UploadDocumentValue | null) => {
      if (isDocumentControlled && controlledOnDocumentChange) {
        controlledOnDocumentChange(next)
      } else {
        setInternalDocument(next)
        controlledOnDocumentChange?.(next)
      }
    },
    [isDocumentControlled, controlledOnDocumentChange],
  )

  // Merge documentError (legacy) with fieldErrors.document for inline display
  const effectiveDocumentError =
    documentError ?? fieldErrors?.document ?? undefined

  const hasFooterHandlers = Boolean(onPreview || onSaveDraft || onSubmit)

  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden w-full">
      <Header />

      {/* Scrollable form area — preserves outer layout; only this region scrolls. Gap + pb10 per spec */}
      <div className="flex-1 min-h-0 overflow-y-auto px-[30px] py-[20px] flex flex-col">
        {/* Research Title — controlled, pure validation via validation.ts, pb10 inside field */}
        <ResearchTitleInput
          value={effectiveTitle}
          onChange={handleTitleChange}
          readOnly={isReadOnly}
          error={fieldErrors?.title ?? undefined}
        />

        {/* Abstract — h140, rounded-9px, bottom bar with Recommended + xx/600 counter, pb10 */}
        <AbstractTextarea
          value={effectiveAbstract}
          onChange={handleAbstractChange}
          readOnly={isReadOnly}
          error={fieldErrors?.abstract ?? undefined}
        />

        {/* Tags — chip input wrap flex-wrap gap5 min-h37.5, Enter adds, X removes, blocks duplicate */}
        <TagChipInput
          value={effectiveTags}
          onChange={handleTagsChange}
          readOnly={isReadOnly}
          error={fieldErrors?.tags ?? undefined}
        />

        {/* Authors — ordered draggable rows, 3 inputs + handle + delete + pick-student, order persisted JSON */}
        <AuthorList
          value={effectiveAuthors}
          onChange={handleAuthorsChange}
          onReorder={handleAuthorsReorder}
          readOnly={isReadOnly}
          error={fieldErrors?.authors ?? undefined}
        />

        {/* Upload Final Document — Idle (drag drop/browse, Only PDF) vs Uploaded (file row 64px, remove) */}
        <UploadDocument
          value={effectiveDocument}
          onChange={handleDocumentChange}
          readOnly={isReadOnly}
          error={effectiveDocumentError}
          submittedByName={submittedByName}
          submittedAt={submittedAt}
        />

        <InfoCallout />

        {isReadOnly && <LockedBanner status={status} />}
      </div>

      {/* Footer — wired in subtask 08: 3 buttons flex justify-end gap10 px30 py10 border-t #f0f2fa */}
      {hasFooterHandlers ? (
        <FooterActions
          isReadOnly={isReadOnly}
          status={status}
          isSubmitDisabled={isSubmitDisabled}
          submitDisabledReason={submitDisabledReason}
          isSubmitting={isSubmitting}
          isSavingDraft={isSavingDraft}
          isSaveDraftDisabled={isSaveDraftDisabled}
          onPreview={onPreview ?? (() => {})}
          onSaveDraft={onSaveDraft ?? (() => {})}
          onSubmit={onSubmit ?? (() => {})}
        />
      ) : (
        // Fallback placeholder when not wired (keeps old layout for tests or standalone preview)
        <div className="border-t border-[#f0f2fa] px-[30px] py-[10px] flex justify-end gap-[10px] shrink-0 bg-white">
          <button
            type="button"
            disabled
            className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] text-[#5a6382] opacity-60 cursor-not-allowed"
          >
            Show Preview
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            className={`h-[36px] px-[16px] rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] transition-colors ${
              isReadOnly
                ? 'text-[#9ea8c6] opacity-60 cursor-not-allowed'
                : 'text-[#5a6382] hover:bg-[#f8f9ff]'
            }`}
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled
            className="h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] opacity-60 cursor-not-allowed bg-gradient-to-r from-[#707dff] to-[#5565ff] border border-[rgba(112,125,255,0.2)]"
          >
            Submit Capstone
          </button>
        </div>
      )}
    </div>
  )
}
