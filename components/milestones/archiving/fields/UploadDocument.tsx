'use client'

import { useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { File as FileIcon, X, Loader2, Upload } from 'lucide-react'
import { isPdfMime } from '@/lib/archiving/validation'
import { uploadArchivingDocument } from '@/lib/actions/archiving'

export interface UploadDocumentValue {
  blobUrl: string | null
  fileName: string | null
  mimeType: string | null
  size: number | null
  uploadedAt?: string | null
  uploadedByName?: string | null
  uploadedById?: number | null
}

interface UploadDocumentProps {
  value?: UploadDocumentValue | null
  onChange?: (next: UploadDocumentValue | null) => void
  readOnly?: boolean
  error?: string
  id?: string
  /** Optional display overrides for meta line — when not in value */
  submittedByName?: string | null
  submittedAt?: string | null
}

// ───────── helpers (pure) ─────────

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateLabel(iso: string | null | undefined): string {
  if (!iso)
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso ?? ''
  }
}

export function UploadDocument({
  value,
  onChange,
  readOnly = false,
  error: externalError,
  id = 'upload-document',
  submittedByName,
  submittedAt,
}: UploadDocumentProps) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ? Number(session.user.id) : null
  const currentUserName = session?.user?.name ?? null
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<{
    name: string
    size: number
  } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)

  const hasValue = Boolean(value?.blobUrl && value?.fileName)

  // Derive display error: external required error vs internal mime/upload error
  // readOnly never shows error (locked state hides validation)
  let displayError: string | null = null
  if (externalError !== undefined) {
    displayError = externalError || null
  } else if (!readOnly && internalError) {
    displayError = internalError
  }
  // When pristine and no value, don't flash required until parent tells us (externalError)
  const hasError = Boolean(displayError)

  const handleBrowseClick = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation()
      if (readOnly || isUploading) return
      inputRef.current?.click()
    },
    [readOnly, isUploading],
  )

  const handleContainerClick = useCallback(() => {
    if (readOnly || isUploading || hasValue) return
    inputRef.current?.click()
  }, [readOnly, isUploading, hasValue])

  const processFile = useCallback(
    async (file: File) => {
      // Security: validate mime at boundary, no path traversal (sanitized server-side)
      // No size limit per spec — handle Blob error generically
      const mime = (file.type ?? '').trim()
      // Strict PDF check via isPdfMime; also allow .pdf extension fallback when mime empty (some browsers)
      const isPdf =
        isPdfMime(mime) ||
        (mime === '' && file.name.toLowerCase().endsWith('.pdf'))
      if (!isPdf) {
        const msg = 'Only PDF files are allowed.'
        setInternalError(msg)
        return
      }

      setIsUploading(true)
      setPendingFile({ name: file.name, size: file.size })
      setInternalError(null)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await uploadArchivingDocument(null, formData)

        if (!res.success || !res.payload) {
          const msg = res.message || 'Upload failed. Please try again.'
          setInternalError(msg)
          // Keep file in UI? For blob failure there is no file; for DB-save failure parent keeps value.
          return
        }

        const payload = res.payload as {
          blobUrl: string
          fileName: string
          mimeType: string
          size: number
        }

        const next: UploadDocumentValue = {
          blobUrl: payload.blobUrl,
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          size: payload.size,
          uploadedAt: new Date().toISOString(),
          uploadedByName: currentUserName ?? submittedByName ?? null,
          uploadedById: currentUserId,
        }

        onChange?.(next)
        // Reset input to allow re-selecting same file for replace
        if (inputRef.current) inputRef.current.value = ''
        setInternalError(null)
      } catch {
        const msg = 'Upload failed. Please try again.'
        setInternalError(msg)
      } finally {
        setIsUploading(false)
        setPendingFile(null)
      }
    },
    [onChange, currentUserName, currentUserId],
  )

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      await processFile(file)
    },
    [processFile],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (readOnly || isUploading) return
      setIsDragOver(true)
    },
    [readOnly, isUploading],
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (readOnly || isUploading) return
      setIsDragOver(true)
    },
    [readOnly, isUploading],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (readOnly || isUploading) return
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      await processFile(file)
    },
    [readOnly, isUploading, processFile],
  )

  const handleRemove = useCallback(async () => {
    if (readOnly || isUploading) return
    // Clear local value; parent will persist via save draft or dedicated remove action
    // Keep error handling: if parent persists and DB save fails, parent keeps file in UI with retry
    onChange?.(null)
    setInternalError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [readOnly, isUploading, onChange])

  // Meta line: "PDF · 3.7 MB · May 30, 2026 · Submitted by Name" — show "You" only for current user's own upload
  const fileName = value?.fileName ?? ''
  const sizeLabel = formatFileSize(value?.size ?? null)
  const dateLabel = formatDateLabel(value?.uploadedAt ?? submittedAt ?? null)
  const submitter = (() => {
    if (value?.uploadedByName) {
      const isOwn = value.uploadedById != null && currentUserId != null && Number(value.uploadedById) === currentUserId
      return isOwn ? 'You' : value.uploadedByName
    }
    if (value?.uploadedById != null && currentUserId != null && Number(value.uploadedById) === currentUserId) return 'You'
    if (submittedByName) {
      if (currentUserName && submittedByName === currentUserName) return 'You'
      return submittedByName
    }
    if (value?.uploadedById != null) return value.uploadedByName ?? 'Unknown'
    return 'You'
  })()

  const idleBorder = hasError
    ? 'border-[#e11d48] bg-[#fff1f2]'
    : isDragOver
      ? 'border-[#707dff] bg-[#eef2ff]'
      : 'border-[#e8ebf8] bg-[#fafbff]'
  const uploadedBorder = hasError ? 'border-[#e11d48]' : 'border-[#e8ebf8]'
  const idleBg = readOnly ? 'bg-[#f8f9ff] opacity-60 cursor-not-allowed' : ''
  const uploadedBg = readOnly ? 'bg-[#f8f9ff] opacity-90' : 'bg-[#fafbff]'

  return (
    <div className="flex flex-col gap-[6px] w-full pb-[10px]">
      {/* Label — 12.5px bold #3a4170 + red * */}
      <label
        htmlFor={id}
        className="font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]"
      >
        Upload Final Document <span className="text-[#ef4444]">*</span>
      </label>
      <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">
        PDF only. Required before submission.
      </p>

      {/* Hidden input — accept only PDF, supports click to open file picker */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
        disabled={readOnly || isUploading}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {isUploading && pendingFile ? (
        // ───────── Uploading — show file with centered layout, button loading + progress bar ─────────
        <div
          className={`relative overflow-hidden flex items-center gap-3 p-3 min-h-[64px] w-full rounded-xl border bg-white shadow-sm transition-colors ${uploadedBorder} ${hasError ? 'bg-[#fff1f2] border-[#e11d48]' : 'border-[#e8ebf8] hover:border-[#d4d8f0]'}`}
        >
          <div className="size-10 rounded-xl bg-[#f4f6ff] border border-[#e5e8ff] flex items-center justify-center shrink-0">
            <FileIcon className="size-[18px] text-[#707dff]" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <p className="font-sans font-semibold text-[13px] leading-[18px] text-[#1e2145] truncate" title={pendingFile.name}>
              {pendingFile.name}
            </p>
            <p className="font-sans font-medium text-xs leading-4 text-[#6b7399] flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1">PDF</span>
              <span className="text-[#d4d8f0]">·</span>
              <span>{formatFileSize(pendingFile.size)}</span>
              <span className="text-[#d4d8f0]">·</span>
              <span className="inline-flex items-center gap-1 text-[#707dff] font-medium">
                <Loader2 className="size-3 animate-spin" style={{ animationDuration: '1000ms' } as React.CSSProperties} />
                Uploading…
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-medium text-xs text-[#707dff]">
              <Loader2 className="size-3 animate-spin" style={{ animationDuration: '1000ms' } as React.CSSProperties} />
              Uploading
            </span>
          </div>

          {/* Progress bar — indeterminate, bottom edge */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#eef2ff] overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-[#707dff] to-[#5a6bff] rounded-full" style={{ animation: 'shimmer 1.2s ease-in-out infinite' }} />
          </div>
          <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
        </div>
      ) : !hasValue ? (
        // ───────── Idle state ─────────
        <div
          role="button"
          tabIndex={readOnly ? -1 : 0}
          aria-label="Upload final document"
          aria-disabled={readOnly}
          onClick={handleContainerClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleBrowseClick()
            }
          }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center px-[13px] py-[21px] gap-[5px] rounded-[10px] border w-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[rgba(112,125,255,0.18)] focus-visible:border-[#707dff] ${idleBorder} ${idleBg} ${readOnly ? '' : 'cursor-pointer hover:border-[#d4d8f0]'} ${hasError ? 'border-[#e11d48]' : ''}`}
        >
          <div className="size-[48px] rounded-[24px] bg-[#eef0fb] flex items-center justify-center shrink-0">
            <Upload className="size-[20px] text-[#707dff]" strokeWidth={2} />
          </div>

          <p className="font-heading font-bold text-[14px] leading-[18px] text-[#1e3a8a] text-center">
            Drag and drop your document here
          </p>

          {!readOnly && (
            <>
              <p className="font-sans font-medium text-[12.5px] leading-[16px] text-[#8a93b4]">
                or
              </p>
              <button
                type="button"
                onClick={handleBrowseClick}
                disabled={readOnly}
                className="h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] bg-gradient-to-r from-[#707dff] to-[#5565ff] border border-[rgba(112,125,255,0.2)] hover:opacity-95 active:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)]"
              >
                Browse Files
              </button>
            </>
          )}

          {readOnly && (
            <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6] pt-[2px]">
              Upload locked — submission in review.
            </p>
          )}

          <p className="font-sans text-[11px] leading-[14px] text-[#bbc0d8] text-center pt-[2px]">
            Only PDF file format is accepted
          </p>
        </div>
      ) : (
        // ───────── Uploaded state — polished, centered, visually appealing ─────────
        <div
          className={`flex items-center gap-3 p-3 min-h-[68px] w-full rounded-xl border bg-white shadow-sm transition-colors ${hasError ? 'bg-[#fff1f2] border-[#e11d48]' : 'border-[#e8ebf8] hover:border-[#d4d8f0] hover:shadow-md'} ${readOnly ? 'opacity-90' : ''}`}
        >
          <div className="size-10 rounded-xl bg-[#f4f6ff] border border-[#e5e8ff] flex items-center justify-center shrink-0">
            <FileIcon className="size-[18px] text-[#707dff]" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <p className="font-sans font-semibold text-[13px] leading-[18px] text-[#1e2145] truncate" title={fileName}>
              {fileName}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans font-medium text-xs leading-4 text-[#6b7399]">
              <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#707dff]" /> PDF</span>
              <span className="text-[#d4d8f0]">·</span>
              <span>{sizeLabel}</span>
              <span className="text-[#d4d8f0]">·</span>
              <span>{dateLabel}</span>
              <span className="hidden sm:inline text-[#d4d8f0]">·</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[#8a93b4]">Submitted by <span className="font-semibold text-[#3a4170]">{submitter}</span></span>
            </div>
            <p className="sm:hidden font-sans text-[11px] leading-3 text-[#8a93b4] truncate">Submitted by <span className="font-medium text-[#3a4170]">{submitter}</span></p>
          </div>

          {!readOnly ? (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove document"
              className="inline-flex items-center gap-1 font-sans font-semibold text-xs leading-none text-[#e11d48] hover:text-[#dc2626] active:text-[#b91c1c] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(225,29,72,0.15)] rounded-md px-1.5 py-1.5 -mr-1"
            >
              <X className="size-3.5 text-[#e11d48]" strokeWidth={2.5} />
              Remove
            </button>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#f4f6ff] border border-[#e5e8ff] px-3 py-1.5 font-sans text-xs font-medium text-[#707dff]">
              <span className="size-1.5 rounded-full bg-[#707dff] animate-pulse" />
              Locked
            </span>
          )}
        </div>
      )}

      {/* Error + uploading helper */}
      <div className="min-h-[16px]">
        {hasError && displayError ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="font-sans text-[11px] leading-[16px] text-[#e11d48]"
          >
            {displayError}
          </p>
        ) : isUploading ? (
          <p className="font-sans text-[11px] leading-[16px] text-[#8a93b4]">
            Uploading to Blob storage…
          </p>
        ) : (
          <span
            aria-hidden="true"
            className="font-sans text-[11px] leading-[16px] text-transparent select-none"
          >
            .
          </span>
        )}
      </div>

      {/* Retry helper when upload failed but value missing — keep file in UI with retry via Browse Files */}
      {internalError && !hasValue && !isUploading && !readOnly && (
        <button
          type="button"
          onClick={handleBrowseClick}
          className="self-start font-sans font-medium text-[12px] leading-none text-[#707dff] hover:underline focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)] rounded-[4px]"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export default UploadDocument




