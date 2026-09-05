'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, TriangleAlert, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { put as blobPut } from '@vercel/blob/client'
import {
  resubmitDefenseDocument,
  uploadDefenseToken,
} from '@/lib/actions/student-defense'
import type { DefenseType } from '@prisma/client'

const MAX_SIZE_BYTES = 20 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateFile(file: File | null): string | null {
  if (!file) return 'Please choose a file first.'
  if (file.type !== 'application/pdf') return 'Please choose a PDF file.'
  if (file.size > MAX_SIZE_BYTES) return 'File is too large. Maximum size is 20 MB.'
  return null
}

interface DraftUpload {
  file: File
  status: 'uploading' | 'ready' | 'error'
  progress: number
  blobUrl?: string
}

interface ResubmissionUploadCardProps {
  milestone: string
  defenseType: DefenseType | 'PROPOSAL' | 'FINAL'
  onSubmitted: () => void
}

export function ResubmissionUploadCard({
  milestone,
  defenseType,
  onSubmitted,
}: ResubmissionUploadCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState<DraftUpload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const openPicker = () => inputRef.current?.click()

  async function startUpload(file: File) {
    setDraft({ file, status: 'uploading', progress: 0 })
    setError(null)

    const tokenRes = await uploadDefenseToken(file.name)
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
      console.error('[ResubmissionUploadCard | Upload failed]:', uploadError)
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

  const handleSubmit = async () => {
    if (!draft || draft.status !== 'ready' || !draft.blobUrl || submitting) {
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await resubmitDefenseDocument({
      blobUrl: draft.blobUrl,
      fileName: draft.file.name,
      size: draft.file.size,
      mimeType: 'application/pdf',
    })
    setSubmitting(false)
    if (!res.success) {
      toast.error(res.message)
      return
    }
    toast.success(res.message)
    setDraft(null)
    onSubmitted()
  }

  const isUploading = draft?.status === 'uploading'

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center gap-[8px] px-[16px] pt-[12px] pb-[13px] border-b border-[#f0f2fa]">
        <div className="flex size-[26px] items-center justify-center rounded-[7px] bg-[rgba(112,125,255,0.05)] shrink-0">
          <UploadCloud className="size-[12px] text-[#707dff]" strokeWidth={2} />
        </div>
        <p className="font-sora text-[12px] font-bold text-[#1e3a8a]">Resubmitted Document</p>
      </div>

      <div className="p-[14px] flex flex-col gap-[12px]">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          aria-label="Choose a PDF file to upload"
          onChange={handleFileSelect}
        />

        {draft ? (
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center gap-[11px] px-[14px] py-[12px] rounded-[10px] bg-[#f8f9ff] border border-[rgba(112,125,255,0.13)]">
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
                      : `PDF · ${formatSize(draft.file.size)} · Ready to submit`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={draft.status !== 'ready' || submitting}
                title={draft.status !== 'ready' ? 'Wait for the upload to finish' : undefined}
                className="flex items-center gap-[7px] px-[18px] py-[8px] rounded-[9px] border border-[rgba(112,125,255,0.6)] text-white font-sans font-bold text-[12px] drop-shadow-[0px_3px_4px_rgba(112,125,255,0.2)] transition-opacity hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                style={{
                  backgroundImage: 'linear-gradient(159deg, #707dff 0%, #5565ff 100%)',
                }}
              >
                {submitting ? (
                  <Loader2 className="size-[13px] animate-spin motion-reduce:animate-none" />
                ) : (
                  <UploadCloud className="size-[12px]" />
                )}
                Submit
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
              <p className="font-sans font-medium text-[11.5px] leading-[18.4px] text-[#16a34a]">
                Upload complete. Submit when you're ready to send it to the panel for review.
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
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload resubmitted document"
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
              <UploadCloud className="size-[20px] text-[#707dff]" strokeWidth={1.75} />
            </div>
            <p className="pt-[14px] font-sora text-[14px] font-bold text-[#1e3a8a]">Drag and drop your revised document here</p>
            <div className="flex items-center gap-[7px] pt-[6px]">
              <span className="font-sans font-medium text-[12.5px] text-[#8a93b4]">or</span>
              <button
                type="button"
                onClick={openPicker}
                className="flex items-center gap-[7px] px-[20px] py-[9px] rounded-[9px] text-white font-sans font-bold text-[12.5px] drop-shadow-[0px_4px_6px_rgba(112,125,255,0.21)] transition-opacity hover:opacity-95"
                style={{
                  backgroundImage: 'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
                }}
              >
                <UploadCloud className="size-[12px]" />
                Browse Files
              </button>
            </div>
            <p className="pt-[10px] font-sans font-medium text-[11px] text-[#bbc0d8]">PDF only · Maximum file size: 20 MB</p>
          </div>
        )}

        {error && (
          <div className="flex gap-[6px] items-start">
            <TriangleAlert className="size-[13px] text-[#e11d48] shrink-0 mt-px" />
            <p className="font-medium text-[12px] leading-[17.4px] text-[#e11d48]">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
