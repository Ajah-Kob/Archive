'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  X,
  Info,
  FileText,
  Upload,
  Loader2,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { publishArchive } from '@/lib/actions/repository'
import { ResearchTitleInput } from '@/components/milestones/archiving/fields/ResearchTitleInput'
import { AbstractTextarea } from '@/components/milestones/archiving/fields/AbstractTextarea'
import { TagChipInput } from '@/components/milestones/archiving/fields/TagChipInput'
import {
  isValidTitle,
  isValidAbstract,
  isValidTags,
  isValidAuthors,
  isValidEmailFormat,
  isPdfMime,
  countWords,
  countChars,
  countSentences,
  TITLE_MAX_WORDS,
  TITLE_MAX_CHARS,
  ABSTRACT_MAX_SENTENCES,
  ABSTRACT_MAX_CHARS,
  type AuthorEntry,
} from '@/lib/archiving/validation'
import { arrayMove } from '@/lib/archiving/author-helpers'

// ───────────────────────────── pure helpers ─────────────────────────────

function todayInputValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatPublishDateLabel(raw: string | null | undefined): string {
  if (!raw || raw.trim().length === 0) return 'Today (default)'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** PDF check mirroring UploadDocument + publishArchive: strict mime, .pdf fallback when mime is empty. */
function isPdfFile(file: File): boolean {
  const mime = (file.type ?? '').trim()
  return (
    isPdfMime(mime) ||
    (mime === '' && file.name.toLowerCase().endsWith('.pdf'))
  )
}

function generateAuthorId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEmptyAuthor(): AuthorEntry {
  return {
    id: generateAuthorId(),
    lastName: '',
    firstName: '',
    email: '',
    userId: null,
  }
}

interface ModalValidation {
  valid: boolean
  message: string
}

/**
 * Client-side publish gating — mirrors the server messages in
 * validatePublishArchivePayload (lib/actions/repository.ts) so the
 * disabled tooltip and toast match what the server enforces.
 */
function getFirstInvalid(
  title: string,
  abstract: string,
  tags: string[],
  authors: AuthorEntry[],
  file: File | null,
  publishDateRaw: string,
): ModalValidation {
  const trimmedTitle = (title ?? '').trim()
  if (trimmedTitle.length === 0) {
    return { valid: false, message: 'Research title is required.' }
  }
  if (countChars(title) > TITLE_MAX_CHARS) {
    return {
      valid: false,
      message: `Research title must be at most ${TITLE_MAX_CHARS} characters (current: ${countChars(title)}).`,
    }
  }
  if (countWords(title) > TITLE_MAX_WORDS) {
    return {
      valid: false,
      message: `Research title must be at most ${TITLE_MAX_WORDS} words (current: ${countWords(title)}).`,
    }
  }
  if (!isValidTitle(title)) {
    return { valid: false, message: 'Research title is invalid.' }
  }

  const trimmedAbstract = (abstract ?? '').trim()
  if (trimmedAbstract.length === 0) {
    return { valid: false, message: 'Abstract is required.' }
  }
  if (countChars(abstract) > ABSTRACT_MAX_CHARS) {
    return {
      valid: false,
      message: `Abstract must be at most ${ABSTRACT_MAX_CHARS} characters (current: ${countChars(abstract)}).`,
    }
  }
  if (countSentences(abstract) > ABSTRACT_MAX_SENTENCES) {
    return {
      valid: false,
      message: `Abstract must be at most ${ABSTRACT_MAX_SENTENCES} sentences (current: ${countSentences(abstract)}).`,
    }
  }
  if (!isValidAbstract(abstract)) {
    return { valid: false, message: 'Abstract is invalid.' }
  }

  if (!isValidTags(tags)) {
    if (!Array.isArray(tags) || tags.length < 1) {
      return { valid: false, message: 'At least one tag is required.' }
    }
    const hasEmpty = tags.some((t) => !t || t.trim().length === 0)
    if (hasEmpty) return { valid: false, message: 'Tags cannot be empty.' }
    const normalized = tags.map((t) => t.trim().toLowerCase())
    const dup = new Set(normalized).size !== normalized.length
    if (dup) return { valid: false, message: 'Duplicate tags are not allowed.' }
    return { valid: false, message: 'Tags are invalid.' }
  }

  if (!isValidAuthors(authors)) {
    if (!Array.isArray(authors) || authors.length < 1) {
      return { valid: false, message: 'At least one author is required.' }
    }
    const hasMissing = authors.some(
      (a) => !a.lastName?.trim() || !a.firstName?.trim() || !a.email?.trim(),
    )
    if (hasMissing) {
      return {
        valid: false,
        message: 'Each author requires last name, first name, and email.',
      }
    }
    const hasBadEmail = authors.some((a) => !isValidEmailFormat(a.email))
    if (hasBadEmail) {
      return {
        valid: false,
        message: 'One or more authors have an invalid email.',
      }
    }
    return { valid: false, message: 'Duplicate authors are not allowed.' }
  }

  if (!file) {
    return { valid: false, message: 'Final document is required.' }
  }
  if (!isPdfFile(file)) {
    return { valid: false, message: 'Only PDF files are allowed.' }
  }

  if (publishDateRaw.trim().length > 0) {
    const parsed = new Date(publishDateRaw)
    if (Number.isNaN(parsed.getTime())) {
      return { valid: false, message: 'Invalid publish date.' }
    }
  }

  return { valid: true, message: '' }
}

// ───────────────────────────── ModalHeader ─────────────────────────────

function ModalHeader({ onClose, disabled }: { onClose: () => void; disabled: boolean }) {
  return (
    <div className="px-[24px] pt-[20px] pb-[14px] border-b border-[#f0f2fa] shrink-0 bg-white">
      <div className="flex items-start justify-between gap-[16px]">
        <div className="min-w-0">
          <h2
            id="upload-archive-title"
            className="font-heading font-bold text-[16px] leading-[24px] tracking-[-0.16px] text-[#10133a]"
          >
            Upload Archive
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          aria-label="Close upload archive"
          className="size-[30px] rounded-[10px] bg-[#fafbff] border border-[#eceef8] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]"
        >
          <X className="size-[14px] text-[#8a93b4]" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

function PublishCallout() {
  return (
    <div className="flex items-start gap-[10px] rounded-[10px] border border-[#e0e3f0] bg-[#f8f9ff] px-[14px] py-[10px]">
      <Info className="size-[16px] text-[#707dff] shrink-0 mt-[1px]" strokeWidth={2} />
      <p className="font-sans text-[12.5px] leading-[18px] text-[#5a6382]">
        Publishing makes this archive visible in the Repository immediately.
      </p>
    </div>
  )
}

// ───────────────────────────── PublishDateInput ─────────────────────────────
// Explicit variant (not a boolean mode): the admin modal owns its publish
// date, defaulting to today. Editable so backdated archives can be recorded.

function PublishDateInput({
  value,
  onChange,
  error,
  id = 'publish-date',
}: {
  value: string
  onChange: (next: string) => void
  error?: string
  id?: string
}) {
  const hasError = Boolean(error)
  const borderClass = hasError
    ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]'
    : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'
  return (
    <div className="flex flex-col gap-[6px] w-full pb-[10px]">
      <label
        htmlFor={id}
        className="font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]"
      >
        Publish Date <span className="text-[#ef4444]">*</span>
      </label>
      <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">
        Shown in the Repository as the publish date. Defaults to today.
      </p>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`h-[38px] w-full rounded-[9px] border px-[12px] font-sans font-medium text-[13px] leading-[19px] outline-none transition-colors text-[#1e2145] bg-white ${borderClass}`}
      />
      <div className="min-h-[16px]">
        {hasError && error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="font-sans text-[11px] leading-[16px] text-[#e11d48]"
          >
            {error}
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
    </div>
  )
}

// ───────────────────────────── ManualAuthorList ─────────────────────────────
// Explicit admin variant of AuthorList: manual rows only — no group-member
// picker, no session/workspace fetch. Row visuals mirror AuthorList; every
// entry stays custom (userId: null).

function ManualAuthorList({
  value,
  onChange,
  error: externalError,
  id = 'authors',
}: {
  value: AuthorEntry[]
  onChange: (next: AuthorEntry[]) => void
  error?: string
  id?: string
}) {
  const authors = Array.isArray(value) ? value : []
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const duplicateSet = useMemo(() => {
    const dupIndices = new Set<number>()
    if (authors.length < 2) return dupIndices
    for (let i = 0; i < authors.length; i++) {
      for (let j = i + 1; j < authors.length; j++) {
        const a = authors[i]
        const b = authors[j]
        if (!a || !b) continue
        const emailA = (a.email ?? '').trim().toLowerCase()
        const emailB = (b.email ?? '').trim().toLowerCase()
        const nameA = `${(a.firstName ?? '').trim().toLowerCase()}|${(a.lastName ?? '').trim().toLowerCase()}`
        const nameB = `${(b.firstName ?? '').trim().toLowerCase()}|${(b.lastName ?? '').trim().toLowerCase()}`
        if (
          (emailA && emailA === emailB) ||
          (nameA !== '|' && nameA === nameB)
        ) {
          dupIndices.add(i)
          dupIndices.add(j)
        }
      }
    }
    return dupIndices
  }, [authors])

  const overallError = useMemo(() => {
    if (externalError !== undefined) return externalError || null
    if (duplicateSet.size > 0) return 'Duplicate authors are not allowed.'
    return null
  }, [externalError, duplicateSet])

  const handleFieldChange = useCallback(
    (index: number, field: keyof AuthorEntry, val: string) => {
      const next = [...authors]
      const current = next[index] as AuthorEntry
      next[index] = { ...current, [field]: val } as AuthorEntry
      onChange(next)
    },
    [authors, onChange],
  )

  const handleDelete = useCallback(
    (index: number) => {
      onChange(authors.filter((_, i) => i !== index))
      setActiveIndex(null)
    },
    [authors, onChange],
  )

  const handleAdd = useCallback(() => {
    const next = [...authors, createEmptyAuthor()]
    onChange(next)
    setActiveIndex(next.length - 1)
  }, [authors, onChange])

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return
      onChange(arrayMove(authors, index, index - 1))
      setActiveIndex(index - 1)
    },
    [authors, onChange],
  )

  const moveDown = useCallback(
    (index: number) => {
      if (index >= authors.length - 1) return
      onChange(arrayMove(authors, index, index + 1))
      setActiveIndex(index + 1)
    },
    [authors, onChange],
  )

  return (
    <div className="flex flex-col gap-[6px] w-full pb-[10px]">
      <label className="font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]">
        Authors <span className="text-[#ef4444]">*</span>
      </label>
      <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">
        Add all researchers involved in this study. Use arrows to reorder.
      </p>

      <div className="flex flex-col gap-[10px] w-full">
        {authors.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#d4d8f0] bg-[#fafbff] px-[14px] py-[12px] flex items-center justify-center">
            <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6] text-center">
              No authors yet. Add at least one.
            </p>
          </div>
        ) : (
          authors.map((author, index) => {
            const isDuplicateRow = duplicateSet.has(index)
            const showRowError = isDuplicateRow
            const rowBorder = showRowError
              ? 'border-[#e11d48]'
              : activeIndex === index
                ? 'border-[#707dff] ring-2 ring-[rgba(112,125,255,0.15)] bg-white'
                : 'border-[#e8ebf8]'
            const stableKey = author.id ?? `author-${index}`
            const isActive = activeIndex === index
            const emailInvalid = Boolean(
              author.email.trim() && !isValidEmailFormat(author.email),
            )
            const isDuplicateEmail =
              isDuplicateRow &&
              authors.some(
                (a, i) =>
                  i !== index &&
                  a.email.trim().toLowerCase() ===
                    author.email.trim().toLowerCase() &&
                  author.email.trim(),
              )
            const isDuplicateName =
              isDuplicateRow &&
              authors.some(
                (a, i) =>
                  i !== index &&
                  `${a.firstName.trim().toLowerCase()}|${a.lastName.trim().toLowerCase()}` ===
                    `${author.firstName.trim().toLowerCase()}|${author.lastName.trim().toLowerCase()}` &&
                  `${author.firstName.trim().toLowerCase()}|${author.lastName.trim().toLowerCase()}` !==
                    '|',
              )
            return (
              <div
                key={stableKey}
                onClick={() => setActiveIndex(index)}
                onFocusCapture={() => setActiveIndex(index)}
                tabIndex={-1}
                className={`bg-[#fafbff] border rounded-[10px] px-[12px] py-[10px] flex gap-[10px] items-center w-full transition-colors ${rowBorder} ${isActive ? 'bg-white shadow-sm' : ''} cursor-pointer`}
              >
                <div className="hidden sm:flex flex-col gap-[2px] shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveUp(index)
                    }}
                    disabled={index === 0}
                    aria-label={`Move author ${index + 1} up`}
                    className={`size-[22px] rounded-[6px] border flex items-center justify-center transition-colors ${index === 0 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed' : 'bg-white border-[#e8ebf8] text-[#8a93b4] hover:border-[#707dff] hover:text-[#707dff] active:bg-[#f4f6ff]'}`}
                  >
                    <ChevronUp className="size-[10px]" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveDown(index)
                    }}
                    disabled={index === authors.length - 1}
                    aria-label={`Move author ${index + 1} down`}
                    className={`size-[22px] rounded-[6px] border flex items-center justify-center transition-colors ${index >= authors.length - 1 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed' : 'bg-white border-[#e8ebf8] text-[#8a93b4] hover:border-[#707dff] hover:text-[#707dff] active:bg-[#f4f6ff]'}`}
                  >
                    <ChevronDown className="size-[10px]" strokeWidth={2.5} />
                  </button>
                </div>

                <span className="shrink-0 font-sans font-medium text-[11px] leading-[14px] text-[#9ea8c6] min-w-[56px]">
                  Author {index + 1}:
                </span>

                <div className="flex-1 min-w-0 flex flex-wrap lg:flex-nowrap gap-[8px] items-center">
                  <input
                    type="text"
                    value={author.lastName}
                    onChange={(e) => handleFieldChange(index, 'lastName', e.target.value)}
                    onFocus={() => setActiveIndex(index)}
                    placeholder="Lastname"
                    aria-label={`Author ${index + 1} last name`}
                    className={`flex-1 min-w-[110px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[#9ea8c6] placeholder:font-normal transition-colors ${isDuplicateName ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} text-[#1e2145]`}
                  />
                  <input
                    type="text"
                    value={author.firstName}
                    onChange={(e) => handleFieldChange(index, 'firstName', e.target.value)}
                    onFocus={() => setActiveIndex(index)}
                    placeholder="Firstname"
                    aria-label={`Author ${index + 1} first name`}
                    className={`flex-1 min-w-[110px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[#9ea8c6] placeholder:font-normal transition-colors ${isDuplicateName ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} text-[#1e2145]`}
                  />
                  <input
                    type="email"
                    value={author.email}
                    onChange={(e) => handleFieldChange(index, 'email', e.target.value)}
                    onFocus={() => setActiveIndex(index)}
                    placeholder="Email"
                    aria-label={`Author ${index + 1} email`}
                    className={`flex-1 min-w-[160px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[rgba(158,168,198,0.7)] placeholder:font-normal transition-colors ${emailInvalid || isDuplicateEmail ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} text-[#1e2145]`}
                  />

                  <div className="flex items-center gap-[4px] shrink-0 lg:ml-1">
                    <div className="flex sm:hidden flex-col gap-[2px]">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        aria-label={`Move author ${index + 1} up mobile`}
                        className={`size-[20px] rounded-[6px] border flex items-center justify-center ${index === 0 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6]' : 'bg-white border-[#e8ebf8] text-[#8a93b4]'}`}
                      >
                        <ChevronUp className="size-[10px]" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === authors.length - 1}
                        aria-label={`Move author ${index + 1} down mobile`}
                        className={`size-[20px] rounded-[6px] border flex items-center justify-center ${index >= authors.length - 1 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6]' : 'bg-white border-[#e8ebf8] text-[#8a93b4]'}`}
                      >
                        <ChevronDown className="size-[10px]" strokeWidth={2.5} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      aria-label={`Remove author ${index + 1}`}
                      onFocus={() => setActiveIndex(index)}
                      title="Remove author"
                      className="size-[28px] rounded-[9px] border flex items-center justify-center shrink-0 transition-colors bg-white border-[#e8ebf8] text-[#e11d48] hover:bg-[#fff1f2] hover:border-[#fecdd3] active:bg-[#ffe4e6] focus:outline-none focus:ring-2 focus:ring-[rgba(225,29,72,0.15)]"
                    >
                      <Trash2 className="size-[14px]" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="min-h-[16px]">
        {overallError ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="font-sans text-[11px] leading-[16px] text-[#e11d48]"
          >
            {overallError}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        aria-label="Add another author"
        className="w-full h-[38px] rounded-[10px] border border-dashed flex items-center justify-center gap-[7px] font-sans font-bold text-[12.5px] leading-[18px] transition-colors border-[#d4d8f0] text-[#707dff] bg-white hover:bg-[#f8f9ff] hover:border-[#707dff] active:bg-[#f4f6ff] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
      >
        <Plus className="size-[14px]" strokeWidth={2.5} />
        Add Another Author
      </button>
    </div>
  )
}

// ───────────────────────────── AdminDocumentPicker ─────────────────────────────
// Explicit admin variant of UploadDocument: same idle/uploaded UI and PDF
// validation, but holds the selected File locally and never calls the
// student-only uploadArchivingDocument action (requireStudent +
// group-scoped). The File passes straight through publishArchive, which
// accepts a direct File upload and performs the admin-safe Blob put.

function AdminDocumentPicker({
  file,
  onChange,
  error: externalError,
  id = 'upload-document',
}: {
  file: File | null
  onChange: (next: File | null) => void
  error?: string
  id?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)

  const hasValue = file != null

  let displayError: string | null = null
  if (externalError !== undefined) {
    displayError = externalError || null
  } else if (internalError) {
    displayError = internalError
  }
  const hasError = Boolean(displayError)

  const handleBrowseClick = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    inputRef.current?.click()
  }, [])

  const handleContainerClick = useCallback(() => {
    if (hasValue) return
    inputRef.current?.click()
  }, [hasValue])

  const processFile = useCallback(
    (next: File) => {
      if (!isPdfFile(next)) {
        setInternalError('Only PDF files are allowed.')
        return
      }
      setInternalError(null)
      onChange(next)
      if (inputRef.current) inputRef.current.value = ''
    },
    [onChange],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.files?.[0]
      if (!next) return
      processFile(next)
    },
    [processFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const next = e.dataTransfer.files?.[0]
      if (!next) return
      processFile(next)
    },
    [processFile],
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setInternalError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [onChange])

  const idleBorder = hasError
    ? 'border-[#e11d48] bg-[#fff1f2]'
    : isDragOver
      ? 'border-[#707dff] bg-[#eef2ff]'
      : 'border-[#e8ebf8] bg-[#fafbff]'

  return (
    <div className="flex flex-col gap-[6px] w-full pb-[10px]">
      <label
        htmlFor={id}
        className="font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]"
      >
        Upload Final Document <span className="text-[#ef4444]">*</span>
      </label>
      <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">
        PDF only. Attached on publish — no separate upload step.
      </p>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {!hasValue ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload final document"
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
          className={`flex flex-col items-center px-[13px] py-[21px] gap-[5px] rounded-[10px] border w-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[rgba(112,125,255,0.18)] focus-visible:border-[#707dff] cursor-pointer hover:border-[#d4d8f0] ${idleBorder}`}
        >
          <div className="size-[48px] rounded-[24px] bg-[#eef0fb] flex items-center justify-center shrink-0">
            <Upload className="size-[20px] text-[#707dff]" strokeWidth={2} />
          </div>

          <p className="font-heading font-bold text-[14px] leading-[18px] text-[#1e3a8a] text-center">
            Drag and drop your document here
          </p>

          <p className="font-sans font-medium text-[12.5px] leading-[16px] text-[#8a93b4]">
            or
          </p>
          <button
            type="button"
            onClick={handleBrowseClick}
            className="h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] bg-gradient-to-r from-[#707dff] to-[#5565ff] border border-[rgba(112,125,255,0.2)] hover:opacity-95 active:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)]"
          >
            Browse Files
          </button>

          <p className="font-sans text-[11px] leading-[14px] text-[#bbc0d8] text-center pt-[2px]">
            Only PDF file format is accepted
          </p>
        </div>
      ) : (
        <div
          className={`flex items-center gap-3 p-3 min-h-[68px] w-full rounded-xl border bg-white shadow-sm transition-colors ${hasError ? 'bg-[#fff1f2] border-[#e11d48]' : 'border-[#e8ebf8] hover:border-[#d4d8f0] hover:shadow-md'}`}
        >
          <div className="size-10 rounded-xl bg-[#f4f6ff] border border-[#e5e8ff] flex items-center justify-center shrink-0">
            <FileText className="size-[18px] text-[#707dff]" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <p
              className="font-sans font-semibold text-[13px] leading-[18px] text-[#1e2145] truncate"
              title={file.name}
            >
              {file.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans font-medium text-xs leading-4 text-[#6b7399]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#707dff]" /> PDF
              </span>
              <span className="text-[#d4d8f0]">·</span>
              <span>{formatFileSize(file.size)}</span>
              <span className="text-[#d4d8f0]">·</span>
              <span>Ready to publish</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove document"
            className="inline-flex items-center gap-1 font-sans font-semibold text-xs leading-none text-[#e11d48] hover:text-[#dc2626] active:text-[#b91c1c] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(225,29,72,0.15)] rounded-md px-1.5 py-1.5 -mr-1"
          >
            <X className="size-3.5 text-[#e11d48]" strokeWidth={2.5} />
            Remove
          </button>
        </div>
      )}

      <div className="min-h-[16px]">
        {hasError && displayError ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="font-sans text-[11px] leading-[16px] text-[#e11d48]"
          >
            {displayError}
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
    </div>
  )
}

// ───────────────────────────── PublishFooter ─────────────────────────────
// Publish-only footer: no drafts, no preview step.

function PublishFooter({
  isPublishDisabled,
  disabledReason,
  isPublishing,
  onCancel,
  onPublish,
}: {
  isPublishDisabled: boolean
  disabledReason?: string
  isPublishing: boolean
  onCancel: () => void
  onPublish: () => void
}) {
  const publishTitle = isPublishDisabled
    ? disabledReason ||
      'Please complete all required fields before publishing. Required: title, abstract, at least one tag, at least one valid author (first/last/email), PDF document, and a valid publish date.'
    : isPublishing
      ? 'Publishing…'
      : undefined
  return (
    <div className="border-t border-[#f0f2fa] px-[24px] py-[12px] flex flex-wrap justify-end gap-[10px] shrink-0 bg-white">
      <button
        type="button"
        onClick={onCancel}
        disabled={isPublishing}
        className="inline-flex items-center justify-center h-[36px] px-[16px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
      >
        Cancel
      </button>
      <span className="inline-flex" title={publishTitle}>
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishDisabled}
          aria-label="Publish archive to repository"
          aria-disabled={isPublishDisabled}
          title={publishTitle}
          className={`inline-flex items-center justify-center gap-[8px] h-[36px] px-[19px] py-[9px] rounded-[9px] font-heading font-bold text-[13px] leading-none text-white border shadow-[0px_4px_7px_rgba(112,125,255,0.19)] transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)] focus:ring-offset-1 ${
            isPublishDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95 active:opacity-90 cursor-pointer'
          }`}
          style={{
            background: 'linear-gradient(164deg, #707dff 0%, #5a6bff 100%)',
            borderColor: 'rgba(112,125,255,0.69)',
          }}
        >
          {isPublishing ? (
            <>
              <Loader2
                className="size-[13px] animate-spin"
                style={{ animationDuration: '1000ms' } as React.CSSProperties}
              />
              Publishing…
            </>
          ) : (
            'Publish Archive'
          )}
        </button>
      </span>
    </div>
  )
}

// ───────────────────────────── PublishConfirmDialog ─────────────────────────────
// Confirm step for the Publish-only flow: summary (no preview tabs).

function ConfirmSectionLabel({ children }: { children: string }) {
  return (
    <p className="font-heading font-bold text-[11px] uppercase tracking-[0.6px] text-[#9ea8c6] mb-[6px]">
      {children}
    </p>
  )
}

function PublishConfirmDialog({
  isOpen,
  title,
  tags,
  authors,
  file,
  publishDate,
  isPublishing,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  title: string
  tags: string[]
  authors: AuthorEntry[]
  file: File | null
  publishDate: string
  isPublishing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!isOpen) return null
  const safeTags = Array.isArray(tags) ? tags.filter((t) => t.trim().length > 0) : []
  const hasTitle = (title ?? '').trim().length > 0
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPublishing) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-confirm-title"
        aria-describedby="publish-confirm-desc"
        className="relative bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16),0_4px_16px_rgba(0,0,0,0.06)] border border-[#eceef8] w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[24px] pt-[20px] pb-[14px] border-b border-[#f0f2fa] shrink-0 bg-white">
          <div className="flex items-start justify-between gap-[16px]">
            <div className="min-w-0">
              <h2
                id="publish-confirm-title"
                className="font-heading font-bold text-[16px] leading-[24px] tracking-[-0.16px] text-[#10133a]"
              >
                Publish to Repository?
              </h2>
              <p
                id="publish-confirm-desc"
                className="font-sans font-medium text-[12.5px] leading-[18px] text-[#8a93b4] pt-[2px]"
              >
                Review the summary below before publishing.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              aria-label="Close publish confirmation"
              className="size-[30px] rounded-[10px] bg-[#fafbff] border border-[#eceef8] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]"
            >
              <X className="size-[14px] text-[#8a93b4]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] py-[20px] flex flex-col gap-[20px]">
          <div>
            <ConfirmSectionLabel>Research Title</ConfirmSectionLabel>
            <p className="font-sans font-bold text-[13.5px] leading-[20px] text-[#1e2145] break-words whitespace-pre-wrap">
              {hasTitle ? (
                title.trim()
              ) : (
                <span className="text-[#9ea8c6] font-medium">No title provided</span>
              )}
            </p>
          </div>

          <div>
            <ConfirmSectionLabel>Authors (in order)</ConfirmSectionLabel>
            {authors.length === 0 ? (
              <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6]">
                No authors
              </p>
            ) : (
              <div className="rounded-[10px] border border-[#e8ebf8] divide-y divide-[#f0f2fa] overflow-hidden bg-white">
                {authors.map((a, idx) => (
                  <div
                    key={`${a.email}-${idx}-${a.lastName}`}
                    className="flex items-center gap-[12px] px-[12px] py-[10px]"
                  >
                    <span className="shrink-0 size-[24px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] flex items-center justify-center font-sans font-bold text-[11px] leading-none text-[#707dff]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans font-semibold text-[12.5px] leading-[18px] text-[#1e2145] truncate">
                        {a.lastName?.trim()
                          ? `${a.lastName.trim()}, ${a.firstName?.trim() ?? ''}`.trim()
                          : (a.firstName?.trim() ?? '—')}
                      </p>
                      <p className="font-sans font-medium text-[11.5px] leading-[14px] text-[#8a93b4] truncate">
                        {a.email?.trim() ?? '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <ConfirmSectionLabel>Tags</ConfirmSectionLabel>
            {safeTags.length === 0 ? (
              <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6]">
                No tags
              </p>
            ) : (
              <div className="flex flex-wrap gap-[5px]">
                {safeTags.map((t, idx) => (
                  <span
                    key={`${t}-${idx}`}
                    className="inline-flex items-center h-[23px] px-[9px] py-[2px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <ConfirmSectionLabel>Final Document</ConfirmSectionLabel>
            {file ? (
              <div className="flex items-center gap-[12px] px-[12px] h-[64px] rounded-[10px] bg-[#fafbff] border border-[#e8ebf8]">
                <div className="size-[36px] rounded-[8px] bg-white border border-[#e8ebf8] flex items-center justify-center shrink-0">
                  <FileText className="size-[16px] text-[#707dff]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-sans font-semibold text-[12.5px] leading-[16px] text-[#1e2145] truncate"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="font-sans font-medium text-[11px] leading-[14px] text-[#8a93b4] truncate">
                    PDF · {formatFileSize(file.size)}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-full bg-white border border-[#e5e8ff] px-[8px] py-[3px] font-sans font-semibold text-[11px] text-[#707dff]">
                  Ready
                </span>
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#e8ebf8] bg-[#fafbff] px-[12px] py-[12px]">
                <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6]">
                  No document attached
                </p>
              </div>
            )}
          </div>

          <div>
            <ConfirmSectionLabel>Publish Date</ConfirmSectionLabel>
            <p className="font-sans font-semibold text-[12.5px] leading-[18px] text-[#1e2145]">
              {formatPublishDateLabel(publishDate)}
            </p>
          </div>

          <div
            role="alert"
            className="rounded-[10px] border border-[rgba(225,29,72,0.2)] bg-[rgba(225,29,72,0.07)] px-[14px] py-[10px] flex items-start gap-[10px]"
          >
            <TriangleAlert
              className="size-[16px] text-[#e11d48] shrink-0 mt-[1px]"
              strokeWidth={2}
            />
            <p className="font-sans font-medium text-[12.5px] leading-[18px] text-[#e11d48]">
              Once published, this archive will be visible in the Repository
              immediately.
            </p>
          </div>
        </div>

        <div className="border-t border-[#f0f2fa] bg-white px-[24px] py-[16px] shrink-0 flex items-center justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPublishing}
            aria-label="Confirm publish archive"
            className="inline-flex items-center justify-center gap-[8px] h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] bg-gradient-to-r from-[#707dff] to-[#5565ff] border border-[rgba(112,125,255,0.2)] hover:opacity-95 active:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)] min-w-[180px]"
          >
            {isPublishing ? (
              <>
                <Loader2
                  className="size-[14px] animate-spin"
                  style={{ animationDuration: '1000ms' } as React.CSSProperties}
                />
                Publishing…
              </>
            ) : (
              'Confirm Publish'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────── UploadArchiveModal ─────────────────────────────

export interface UploadArchiveModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called after a successful publish — parent can refresh local state. */
  onUploadComplete?: () => void
}

export function UploadArchiveModal({
  isOpen,
  onClose,
  onUploadComplete,
}: UploadArchiveModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [authors, setAuthors] = useState<AuthorEntry[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [publishDate, setPublishDate] = useState<string>(() => todayInputValue())
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => setMounted(true), [])

  const resetForm = useCallback(() => {
    setTitle('')
    setAbstract('')
    setTags([])
    setAuthors([])
    setFile(null)
    setPublishDate(todayInputValue())
    setSubmitAttempted(false)
    setShowConfirm(false)
    setIsPublishing(false)
  }, [])

  const handleClose = useCallback(() => {
    if (isPublishing) return
    resetForm()
    onClose()
  }, [isPublishing, resetForm, onClose])

  // Focus trap + Esc + body lock
  useEffect(() => {
    if (!isOpen || !mounted) return

    const previouslyFocused = globalThis.document.activeElement as HTMLElement | null
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPublishing) {
        e.preventDefault()
        handleClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement
      if (e.shiftKey) {
        if (globalThis.document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (globalThis.document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
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
  }, [isOpen, mounted, handleClose, isPublishing])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) handleClose()
    },
    [handleClose],
  )

  const validation = useMemo(
    () => getFirstInvalid(title, abstract, tags, authors, file, publishDate),
    [title, abstract, tags, authors, file, publishDate],
  )
  const isPublishDisabled = !validation.valid || isPublishing

  const documentError = useMemo(() => {
    if (file) return undefined
    if (submitAttempted) return 'Final document is required.'
    return undefined
  }, [file, submitAttempted])

  const publishDateError = useMemo(() => {
    if (publishDate.trim().length === 0) return undefined
    const parsed = new Date(publishDate)
    if (Number.isNaN(parsed.getTime())) return 'Invalid publish date.'
    return undefined
  }, [publishDate])

  const handleFileChange = useCallback((next: File | null) => {
    setFile(next)
  }, [])

  const handlePublishClick = useCallback(() => {
    if (isPublishing) return
    setSubmitAttempted(true)
    if (!validation.valid) {
      toast.error(validation.message)
      return
    }
    setShowConfirm(true)
  }, [isPublishing, validation])

  const handleConfirmPublish = useCallback(async () => {
    if (isPublishing) return
    setIsPublishing(true)
    try {
      const formData = new FormData()
      formData.set('title', (title ?? '').trim())
      formData.set('abstract', (abstract ?? '').trim())
      formData.set('tags', JSON.stringify(Array.isArray(tags) ? tags : []))
      formData.set('authorOrder', JSON.stringify(Array.isArray(authors) ? authors : []))
      formData.set('datePublished', (publishDate ?? '').trim())
      if (file) {
        // Direct File pass-through — publishArchive uploads admin-safe inline.
        formData.set('file', file)
      }

      const res = await publishArchive(null, formData)

      if (res.success) {
        toast.success(res.message || 'Archive published to Repository.')
        resetForm()
        onClose()
        onUploadComplete?.()
        router.refresh()
      } else {
        toast.error(res.message || 'Failed to publish archive. Please try again.')
      }
    } catch {
      toast.error('Failed to publish archive. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }, [isPublishing, title, abstract, tags, authors, publishDate, file, resetForm, onClose, onUploadComplete, router])

  if (!mounted || !isOpen) return null

  const content = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      role="presentation"
      style={{ animation: 'backdropIn 300ms ease-out' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-archive-title"
        className="relative bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16),0_4px_16px_rgba(0,0,0,0.06)] border border-[#eceef8] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader onClose={handleClose} disabled={isPublishing} />

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] py-[20px] flex flex-col">
          <ResearchTitleInput value={title} onChange={setTitle} />

          <AbstractTextarea value={abstract} onChange={setAbstract} />

          <TagChipInput value={tags} onChange={setTags} />

          <ManualAuthorList value={authors} onChange={setAuthors} />

          <AdminDocumentPicker
            file={file}
            onChange={handleFileChange}
            error={documentError}
          />

          <PublishDateInput
            value={publishDate}
            onChange={setPublishDate}
            error={publishDateError}
          />

          <div className="pt-[10px]">
            <PublishCallout />
          </div>
        </div>

        <PublishFooter
          isPublishDisabled={isPublishDisabled}
          disabledReason={validation.message}
          isPublishing={isPublishing || showConfirm}
          onCancel={handleClose}
          onPublish={handlePublishClick}
        />
      </div>

      <PublishConfirmDialog
        isOpen={showConfirm}
        title={title}
        tags={tags}
        authors={authors}
        file={file}
        publishDate={publishDate}
        isPublishing={isPublishing}
        onClose={() => {
          if (!isPublishing) setShowConfirm(false)
        }}
        onConfirm={handleConfirmPublish}
      />

      <style>{`@keyframes backdropIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  )

  return createPortal(content, globalThis.document.body)
}

export default UploadArchiveModal
