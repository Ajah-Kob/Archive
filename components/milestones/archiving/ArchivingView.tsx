'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLabel } from '@/components/globals/PageLabel'
import type {
  ArchivingPayload,
  ArchivingUiStatus,
} from '@/lib/actions/archiving'
import { StatusCallout } from './StatusCallout'
import { CapstoneDetailsCard } from './CapstoneDetailsCard'
import { CapstonePreviewModal } from './CapstonePreviewModal'
import { SubmitConfirmationModal } from './SubmitConfirmationModal'
import { useArchivingForm } from './hooks/useArchivingForm'

interface ArchivingViewProps {
  initialStatus: ArchivingUiStatus
  initialData: ArchivingPayload | null
}

export function ArchivingView({
  initialStatus,
  initialData,
}: ArchivingViewProps) {
  const router = useRouter()

  const {
    title,
    abstract,
    tags,
    authors,
    documentValue,
    status,
    isReadOnly,
    fieldErrors,
    isSavingDraft,
    isSubmitting,
    showPreview,
    showSubmitModal,
    isSubmitDisabled,
    isSaveDraftDisabled,
    validationForSubmit,
    setTitle,
    setAbstract,
    setTags,
    setAuthors,
    setAuthorsReorder,
    setDocumentValue,
    setShowPreview,
    setShowSubmitModal,
    handleSaveDraft,
    handleSubmitClick,
    handleSubmitSuccess,
  } = useArchivingForm({ initialData, initialStatus })

  // Keep derived DB state fresh when the student returns to the tab or
  // when the Program Chair approves while the page is open — the status
  // is derived from persisted ArchivingSubmission + CapstoneArchive, so a
  // refresh is sufficient to transition READY → IN_REVIEW → ARCHIVED.
  // Re-fetching getArchivingData is modeled via router.refresh which triggers
  // the server component to re-run getMyArchivingStatus and push new initialData.
  useEffect(() => {
    const syncFromServer = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    window.addEventListener('focus', syncFromServer)
    document.addEventListener('visibilitychange', syncFromServer)
    return () => {
      window.removeEventListener('focus', syncFromServer)
      document.removeEventListener('visibilitychange', syncFromServer)
    }
  }, [router])

  // Derive submit disabled reason for tooltip — mirrors server validation message
  const submitDisabledReason = !validationForSubmit.valid
    ? validationForSubmit.message
    : undefined

  // Footer submit is considered submitting while modal is open to prevent double-open,
  // and while actual submit is in flight (hook's isSubmitting). This satisfies
  // "Prevent double submit: disable Submit Capstone button after first submit until server responds"
  const isFooterSubmitting = isSubmitting || showSubmitModal

  return (
    <>
      <PageLabel label="Archiving" />
      <div className="flex flex-1 min-h-0 flex-col gap-[16px] overflow-hidden w-full">
        <StatusCallout status={status} />

        {/* Card is the primary scroll container; outer stack never overflows the page */}
        <CapstoneDetailsCard
          isReadOnly={isReadOnly}
          status={status}
          title={title}
          onTitleChange={setTitle}
          abstract={abstract}
          onAbstractChange={setAbstract}
          tags={tags}
          onTagsChange={setTags}
          authors={authors}
          onAuthorsChange={setAuthors}
          onAuthorsReorder={setAuthorsReorder}
          document={documentValue}
          onDocumentChange={setDocumentValue}
          fieldErrors={fieldErrors}
          submittedAt={initialData?.updatedAt ?? null}
          onPreview={() => setShowPreview(true)}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmitClick}
          isSubmitDisabled={isSubmitDisabled}
          submitDisabledReason={submitDisabledReason}
          isSubmitting={isFooterSubmitting}
          isSavingDraft={isSavingDraft}
          isSaveDraftDisabled={isSaveDraftDisabled}
        />
      </div>

      {/* Show Preview — reflects current form values, tags wrap new line, authors formatted Lastname, Initials */}
      <CapstonePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={title}
        abstract={abstract}
        tags={tags}
        authors={authors}
        document={documentValue}
      />

      {/* Submit Confirmation — 2 tabs Summary ↔ Preview, warning Once submitted cannot be changed, Confirm/Cancel */}
      <SubmitConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => {
          // Ignore close while submitting (modal itself guards)
          setShowSubmitModal(false)
        }}
        title={title}
        abstract={abstract}
        tags={tags}
        authors={authors}
        document={documentValue}
        onSuccess={handleSubmitSuccess}
      />
    </>
  )
}

export default ArchivingView
