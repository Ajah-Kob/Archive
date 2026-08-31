'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FileText,
  Loader2,
  RefreshCw,
  TriangleAlert,
  UploadCloud,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { put as blobPut } from '@vercel/blob/client'
import type {
  DefenseDocumentInfo,
  DefenseUploadActions,
} from './DefenseDocumentCard'

const MAX_SIZE_BYTES = 20 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateFile(file: File | null): string | null {
  if (!file) return 'Please choose a file first.'
  if (file.type !== 'application/pdf') return 'Please choose a PDF file.'
  if (file.size > MAX_SIZE_BYTES)
    return 'File is too large. Maximum size is 20 MB.'
  return null
}

interface ReplaceDraft {
  file: File
  status: 'uploading' | 'ready' | 'error'
  progress: number
  blobUrl?: string
}

interface ReplaceDocumentModalProps {
  /** The currently-submitted document being replaced. */
  document: DefenseDocumentInfo
  actions: DefenseUploadActions
  onClose: () => void
  onReplaced: () => void
}

/**
 * Modal for replacing a submitted defense document.
 *
 * Contains an upload zone (drag-drop + browse). Picking a file uploads it to
 * blob and shows it in an uploaded state; the replacement is only applied when
 * the user confirms. On success the old blob is deleted by the server action.
 */
export function ReplaceDocumentModal({
  document,
  actions,
  onClose,
  onReplaced,
}: ReplaceDocumentModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState<ReplaceDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [replacing, setReplacing] = useState(false)

  // Close on Escape while open (matches VerdictConfirmModal / drawers).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !replacing) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [replacing, onClose])

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
      console.error('[ReplaceDocumentModal | Upload failed]:', uploadError)
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
    if (draft?.status === 'uploading' || replacing) return
    setDraft(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const confirmReplace = async () => {
    if (
      !draft ||
      draft.status !== 'ready' ||
      !draft.blobUrl ||
      replacing
    ) {
      return
    }
    setReplacing(true)
    setError(null)
    try {
      const res = await actions.replaceDocument({
        blobUrl: draft.blobUrl,
        fileName: draft.file.name,
        size: draft.file.size,
      })
      if (!res.success) {
        setError(res.message)
        return
      }
      toast.success(res.message)
      onReplaced()
    } catch (replaceError) {
      console.error('[ReplaceDocumentModal | Replace failed]:', replaceError)
      setError('The replacement failed. Please try again.')
    } finally {
      setReplacing(false)
    }
  }

  const isUploading = draft?.status === 'uploading'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]"
      onClick={replacing ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-document-title"
        className="w-full max-w-[480px] bg-white border border-[#eceef8] rounded-[16px] shadow-[0_16px_48px_rgba(16,19,58,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-[16px] px-6 pt-5 pb-4 border-b border-[#eceef8]">
          <div>
            <h3
              id="replace-document-title"
              className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]"
            >
              Replace Document
            </h3>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              Upload a new file to replace your submitted document.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={replacing}
            aria-label="Close"
            className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-[16px]">
          {/* Current document */}
          <div className="flex items-center gap-[11px] px-[14px] py-[12px] rounded-[10px] bg-[#fafbff] border border-[#eceef8]">
            <div className="flex size-[36px] items-center justify-center rounded-[9px] bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.14)] shrink-0">
              <FileText className="size-[16px] text-[#707dff]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a]">
                {document.fileName}
              </p>
              <p className="pt-[2px] font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
                Current document
              </p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            aria-label="Choose a replacement defense document PDF"
            onChange={handleFileSelect}
          />

          {draft ? (
            /* Uploaded (draft) state */
            <div className="flex flex-col gap-[10px]">
              <div className="flex items-center gap-[11px] px-[14px] py-[12px] rounded-[10px] bg-[#fafbff] border border-[#eceef8]">
                <div className="flex size-[36px] items-center justify-center rounded-[9px] bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.14)] shrink-0">
                  {isUploading ? (
                    <Loader2 className="size-[16px] text-[#707dff] animate-spin motion-reduce:animate-none" />
                  ) : (
                    <FileText className="size-[16px] text-[#707dff]" strokeWidth={1.75} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a]">
                    {draft.file.name}
                  </p>
                  <p className="pt-[2px] font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
                    {isUploading
                      ? `Uploading… ${draft.progress}%`
                      : draft.status === 'error'
                        ? 'Upload failed'
                        : `PDF · ${formatSize(draft.file.size)} · Ready to replace`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isUploading || replacing}
                  aria-label={`Remove ${draft.file.name}`}
                  className="flex items-center gap-[5px] p-[5px] font-sans font-semibold text-[12px] text-[#ef4444] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <X className="size-[11px]" />
                  Remove
                </button>
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

              {draft.status === 'error' && (
                <button
                  type="button"
                  onClick={() => void startUpload(draft.file)}
                  className="self-start font-sans font-semibold text-[11.5px] text-[#707dff] hover:text-[#5565ff] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none rounded"
                >
                  Retry upload
                </button>
              )}
            </div>
          ) : (
            /* Idle upload zone */
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload replacement document"
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
          )}

          {error && (
            <div className="flex gap-[6px] items-start">
              <TriangleAlert className="size-[13px] text-[#e11d48] shrink-0 mt-px" />
              <p className="font-medium text-[12px] leading-[17.4px] text-[#e11d48]">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[8px] px-6 py-4 border-t border-[#eceef8] bg-[#fafbff] rounded-b-[16px]">
          <button
            type="button"
            onClick={onClose}
            disabled={replacing}
            className="h-[32px] px-[12px] rounded-[8px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirmReplace()}
            disabled={!draft || draft.status !== 'ready' || replacing}
            title={
              !draft || draft.status !== 'ready'
                ? 'Upload a file first'
                : undefined
            }
            className="flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] font-sans font-bold text-[12px] text-white transition-opacity hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 outline-none focus-visible:ring-[rgba(112,125,255,0.4)]"
            style={{
              backgroundImage: 'linear-gradient(159deg, #707dff 0%, #5565ff 100%)',
            }}
          >
            {replacing ? (
              <Loader2 className="size-[13px] animate-spin" />
            ) : (
              <RefreshCw className="size-[13px]" />
            )}
            {replacing ? 'Replacing…' : 'Confirm Replacement'}
          </button>
        </div>
      </div>
    </div>
  )
}
