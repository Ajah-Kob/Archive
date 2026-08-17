'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Lock, TriangleAlert, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { resubmitChapter, submitChapter } from '@/lib/actions/chapter'
import type { ChapterKey, ChapterViewState } from '@/types/milestones'

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
  })
}

function validateFile(file: File | null): string | null {
  if (!file) return 'Please choose a file first.'
  if (file.type !== 'application/pdf') return 'Please choose a PDF file.'
  if (file.size > MAX_SIZE_BYTES) return 'File is too large. Maximum size is 20 MB.'
  return null
}

interface UploadDropzoneProps {
  chapter: ChapterKey
  chapterLabel: string
  state: ChapterViewState
  currentFileName?: string | null
  submittedAt?: string | null
  currentSize?: number | null
  canSubmit?: boolean
  onSubmitted: () => void
}

export function UploadDropzone({
  chapter,
  chapterLabel,
  state,
  currentFileName = null,
  submittedAt = null,
  currentSize = null,
  canSubmit = true,
  onSubmitted,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isResubmitting = state === 'NEEDS_REVISION'
  const isLocked = state === 'IN_REVIEW' || state === 'APPROVED'

  const openPicker = () => inputRef.current?.click()

  const acceptFile = (file: File | null) => {
    const validationError = validateFile(file)
    if (validationError) {
      setDraft(null)
      setError(validationError)
      return
    }
    setDraft(file)
    setError(null)
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
    setDraft(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!draft || submitting || !canSubmit) return
    const validationError = validateFile(draft)
    if (validationError) {
      setDraft(null)
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError(null)
    const formData = new FormData()
    formData.set('file', draft)
    const res = isResubmitting
      ? await resubmitChapter(chapter, formData)
      : await submitChapter(chapter, formData)
    setSubmitting(false)
    if (!res.success) {
      toast.error(res.message)
      return
    }
    toast.success(res.message)
    setDraft(null)
    onSubmitted()
  }

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center gap-[8px] px-[16px] py-[14px] border-b border-[#f0f2fa]">
        <div className="flex size-[26px] items-center justify-center rounded-[7px] bg-[rgba(112,125,255,0.05)] shrink-0">
          <UploadCloud className="size-[14px] text-[#707dff]" strokeWidth={2} />
        </div>
        <p className="font-sora text-[12px] font-semibold text-[#1e3a8a]">
          {isResubmitting ? `Resubmit ${chapterLabel}` : `Upload ${chapterLabel}`}
        </p>
      </div>

      <div className="p-[18px] flex flex-col gap-[12px]">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          aria-label="Choose a PDF file to upload"
          onChange={handleFileSelect}
        />

        {isLocked ? (
          <div className="flex flex-col gap-[10px] rounded-[10px] border border-[rgba(112,125,255,0.13)] bg-[#f8f9ff] p-[16px]">
            <div className="flex items-center gap-[10px] min-w-0">
              <div className="flex size-[36px] items-center justify-center rounded-[8px] bg-[#eef0fb] shrink-0">
                <FileText className="size-[16px] text-[#707dff]" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3c4268]">
                  {currentFileName ?? 'Submitted document'}
                </p>
                <div className="flex items-center gap-[6px] mt-[2px]">
                  <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-[#f4f5fc] text-[8.5px] font-bold text-[#9ea8c6]">
                    PDF
                  </span>
                  {currentSize !== null && (
                    <span className="font-sans font-medium text-[11px] text-[#8a93b4]">
                      {formatSize(currentSize)}
                    </span>
                  )}
                  {submittedAt && (
                    <span className="font-sans font-medium text-[11px] text-[#8a93b4]">
                      Submitted {formatDate(submittedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-[6px]">
              {state === 'IN_REVIEW' ? (
                <span className="flex items-center gap-[5px] font-sans font-medium text-[11.5px] text-[#f59e0b]">
                  <span className="size-[8px] rounded-full bg-[#f59e0b] animate-pulse" />
                  Awaiting adviser review
                </span>
              ) : (
                <span className="flex items-center gap-[5px] font-sans font-medium text-[11.5px] text-[#16a34a]">
                  <Lock className="size-[11px] text-[#16a34a]" strokeWidth={2} />
                  Approved. This chapter is complete.
                </span>
              )}
            </div>
          </div>
        ) : draft ? (
          <div className="flex flex-col gap-[12px] rounded-[10px] border border-[rgba(112,125,255,0.13)] bg-[#f8f9ff] p-[16px]">
            <div className="flex items-center gap-[10px] min-w-0">
              <div className="flex size-[36px] items-center justify-center rounded-[8px] bg-[#eef0fb] shrink-0">
                <FileText className="size-[16px] text-[#707dff]" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3c4268]">
                  {draft.name}
                </p>
                <div className="flex items-center gap-[6px] mt-[2px]">
                  <span className="flex size-[18px] items-center justify-center rounded-[5px] bg-[#f4f5fc] text-[8.5px] font-bold text-[#9ea8c6]">
                    {draft.type.split('/')[1]?.toUpperCase() || 'PDF'}
                  </span>
                  <span className="font-sans font-medium text-[11px] text-[#8a93b4]">
                    {formatSize(draft.size)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                onClick={openPicker}
                disabled={submitting}
                className="flex items-center gap-[5px] h-[26px] px-[10px] bg-white border border-[#e8ebf8] rounded-[7px] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadCloud className="size-[11px]" />
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={submitting}
                aria-label={`Remove ${draft.name}`}
                className="flex items-center gap-[5px] font-sans font-semibold text-[11px] text-[#e11d48] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <X className="size-[11px]" />
                Remove
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!draft || !!error || submitting || !canSubmit}
                className="flex items-center gap-[6px] h-[34px] px-[13px] rounded-[9px] text-white font-sans font-semibold text-[12px] hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ml-auto shrink-0"
                style={{
                  backgroundImage: 'linear-gradient(175deg, #707dff 0%, #5565ff 100%)',
                }}
              >
                {submitting ? (
                  <Loader2 className="size-[13px] animate-spin motion-reduce:animate-none" />
                ) : (
                  <UploadCloud className="size-[12px]" />
                )}
                {isResubmitting ? `Resubmit ${chapterLabel}` : `Submit ${chapterLabel}`}
              </button>
            </div>

            {submitting && (
              <div className="h-[4px] rounded-full bg-[#f0f2fa] overflow-hidden">
                <div className="h-full rounded-full bg-[#707dff] w-full animate-pulse motion-reduce:w-1/2 motion-reduce:animate-none" />
              </div>
            )}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={`Upload ${chapterLabel} document`}
            onClick={openPicker}
            onKeyDown={handleSurfaceKeyDown}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed bg-[#fafbff] px-[30px] py-[22px] text-center cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#707dff] ${
              isDragging ? 'border-[#707dff] bg-[#f8f9ff]' : 'border-[#d0d5ea] hover:border-[#707dff]'
            }`}
          >
            <div className="flex size-[48px] items-center justify-center rounded-[24px] bg-[#eef0fb]">
              <UploadCloud className="size-[24px] text-[#707dff]" strokeWidth={1.75} />
            </div>
            <p className="pt-[12px] font-sans font-semibold text-[13px] text-[#1e3a8a]">
              Drag and drop your document here
            </p>
            <div className="flex items-center gap-[8px] pt-[6px]">
              <span className="font-sans font-medium text-[12px] text-[#5a6382]">or</span>
              <button
                type="button"
                onClick={openPicker}
                className="flex items-center gap-[5px] h-[26px] px-[12px] rounded-[8px] text-white font-sans font-semibold text-[12px] hover:opacity-95 transition-opacity"
                style={{
                  backgroundImage: 'linear-gradient(175deg, #707dff 0%, #5565ff 100%)',
                }}
              >
                Browse Files
              </button>
            </div>
            <p className="pt-[10px] text-[11px] text-[#bbc0d8]">PDF only · Maximum file size: 20 MB</p>
          </div>
        )}

        {error && (
          <div className="flex gap-[6px] items-start">
            <TriangleAlert className="size-[13px] text-[#e11d48] shrink-0 mt-px" />
            <p className="font-medium text-[12px] leading-[17.4px] text-[#e11d48]">{error}</p>
          </div>
        )}

        {!canSubmit && !isLocked && (
          <p className="font-sans font-medium text-[11px] text-[#8a93b4]">
            Confirm your capstone topic before submitting.
          </p>
        )}

        {isResubmitting && currentFileName && (
          <p className="font-sans font-medium text-[11px] text-[#9ea8c6]">
            Current version: {currentFileName}
          </p>
        )}
      </div>
    </div>
  )
}