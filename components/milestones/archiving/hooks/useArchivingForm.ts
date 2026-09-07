'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveArchivingDraft } from '@/lib/actions/archiving'
import {
  isValidTitle,
  isValidAbstract,
  isValidTags,
  isValidAuthors,
  isPdfMime,
  isValidEmailFormat,
  countWords,
  countChars,
  countSentences,
  TITLE_MAX_WORDS,
  TITLE_MAX_CHARS,
  ABSTRACT_MAX_SENTENCES,
  ABSTRACT_MAX_CHARS,
  type AuthorEntry,
} from '@/lib/archiving/validation'
import type { UploadDocumentValue } from '../fields/UploadDocument'
import type { ArchivingPayload, ArchivingUiStatus } from '@/lib/actions/archiving'

// ───────────────────────────── types ─────────────────────────────

export interface UseArchivingFormOptions {
  initialData: ArchivingPayload | null
  initialStatus: ArchivingUiStatus
}

export interface FieldErrors {
  title?: string | null
  abstract?: string | null
  tags?: string | null
  authors?: string | null
  document?: string | null
}

interface ValidationResult {
  valid: boolean
  message: string
  field: keyof FieldErrors | null
  fieldId: string | null
}

// ───────────────────────────── pure helpers ─────────────────────────────

function getFirstInvalid(
  title: string,
  abstract: string,
  tags: string[],
  authors: AuthorEntry[],
  doc: UploadDocumentValue | null,
  requireBlob: boolean,
): ValidationResult {
  // Title: required + 200 chars + 25 words
  const trimmedTitle = (title ?? '').trim()
  if (trimmedTitle.length === 0) {
    return { valid: false, message: 'Research title is required.', field: 'title', fieldId: 'research-title' }
  }
  if (countChars(title) > TITLE_MAX_CHARS) {
    return {
      valid: false,
      message: `Research title must be at most ${TITLE_MAX_CHARS} characters (current: ${countChars(title)}).`,
      field: 'title',
      fieldId: 'research-title',
    }
  }
  if (countWords(title) > TITLE_MAX_WORDS) {
    return {
      valid: false,
      message: `Research title must be at most ${TITLE_MAX_WORDS} words (current: ${countWords(title)}).`,
      field: 'title',
      fieldId: 'research-title',
    }
  }
  if (!isValidTitle(title)) {
    return { valid: false, message: 'Research title is invalid.', field: 'title', fieldId: 'research-title' }
  }

  // Abstract: required + 600 chars + 4 sentences
  const trimmedAbstract = (abstract ?? '').trim()
  if (trimmedAbstract.length === 0) {
    return { valid: false, message: 'Abstract is required.', field: 'abstract', fieldId: 'abstract' }
  }
  if (countChars(abstract) > ABSTRACT_MAX_CHARS) {
    return {
      valid: false,
      message: `Abstract must be at most ${ABSTRACT_MAX_CHARS} characters (current: ${countChars(abstract)}).`,
      field: 'abstract',
      fieldId: 'abstract',
    }
  }
  if (countSentences(abstract) > ABSTRACT_MAX_SENTENCES) {
    return {
      valid: false,
      message: `Abstract must be at most ${ABSTRACT_MAX_SENTENCES} sentences (current: ${countSentences(abstract)}).`,
      field: 'abstract',
      fieldId: 'abstract',
    }
  }
  if (!isValidAbstract(abstract)) {
    return { valid: false, message: 'Abstract is invalid.', field: 'abstract', fieldId: 'abstract' }
  }

  // Tags: min1, no empty, no duplicate
  if (!isValidTags(tags)) {
    if (!Array.isArray(tags) || tags.length < 1) {
      return { valid: false, message: 'At least one tag is required.', field: 'tags', fieldId: 'tags' }
    }
    const hasEmpty = tags.some((t) => !t || t.trim().length === 0)
    if (hasEmpty) return { valid: false, message: 'Tags cannot be empty.', field: 'tags', fieldId: 'tags' }
    const normalized = tags.map((t) => t.trim().toLowerCase())
    const dup = new Set(normalized).size !== normalized.length
    if (dup) return { valid: false, message: 'Duplicate tags are not allowed.', field: 'tags', fieldId: 'tags' }
    return { valid: false, message: 'Tags are invalid.', field: 'tags', fieldId: 'tags' }
  }

  // Authors: min1 triple, block duplicate
  if (!isValidAuthors(authors)) {
    if (!Array.isArray(authors) || authors.length < 1) {
      return { valid: false, message: 'At least one author is required.', field: 'authors', fieldId: 'authors' }
    }
    const hasMissing = authors.some((a) => !a.lastName?.trim() || !a.firstName?.trim() || !a.email?.trim())
    if (hasMissing) {
      return { valid: false, message: 'Each author requires last name, first name, and email.', field: 'authors', fieldId: 'authors' }
    }
    const hasBadEmail = authors.some((a) => !isValidEmailFormat(a.email))
    if (hasBadEmail) {
      return { valid: false, message: 'One or more authors have an invalid email.', field: 'authors', fieldId: 'authors' }
    }
    const emails = authors.map((a) => a.email.trim().toLowerCase())
    if (new Set(emails).size !== emails.length) {
      return { valid: false, message: 'Duplicate authors are not allowed.', field: 'authors', fieldId: 'authors' }
    }
    const names = authors.map((a) => `${a.firstName.trim().toLowerCase()}|${a.lastName.trim().toLowerCase()}`)
    if (new Set(names).size !== names.length) {
      return { valid: false, message: 'Duplicate authors are not allowed.', field: 'authors', fieldId: 'authors' }
    }
    return { valid: false, message: 'Authors are invalid.', field: 'authors', fieldId: 'authors' }
  }

  // Document: PDF only, no size limit, requireBlob controls presence
  const hasBlob = Boolean(doc?.blobUrl && doc?.fileName)
  if (requireBlob) {
    if (!hasBlob || !doc?.blobUrl?.trim()) {
      return { valid: false, message: 'Final document is required.', field: 'document', fieldId: 'upload-document' }
    }
  }
  if (hasBlob && doc?.mimeType && !isPdfMime(doc.mimeType)) {
    return { valid: false, message: 'Only PDF files are allowed.', field: 'document', fieldId: 'upload-document' }
  }
  // If blob present but mime missing, we allow (uploaded via blob put may have mime)
  // but for strict submit we still pass if blobUrl exists and fileName exists

  return { valid: true, message: '', field: null, fieldId: null }
}

function getFirstInvalidForDraft(
  title: string,
  abstract: string,
  tags: string[],
  authors: AuthorEntry[],
  doc: UploadDocumentValue | null,
): ValidationResult {
  const trimmedTitle = (title ?? '').trim()
  if (trimmedTitle.length > 0) {
    if (countChars(title) > TITLE_MAX_CHARS) {
      return {
        valid: false,
        message: `Research title must be at most ${TITLE_MAX_CHARS} characters (current: ${countChars(title)}).`,
        field: 'title',
        fieldId: 'research-title',
      }
    }
    if (countWords(title) > TITLE_MAX_WORDS) {
      return {
        valid: false,
        message: `Research title must be at most ${TITLE_MAX_WORDS} words (current: ${countWords(title)}).`,
        field: 'title',
        fieldId: 'research-title',
      }
    }
    if (!isValidTitle(title)) {
      return { valid: false, message: 'Research title is invalid.', field: 'title', fieldId: 'research-title' }
    }
  }

  const trimmedAbstract = (abstract ?? '').trim()
  if (trimmedAbstract.length > 0) {
    if (countChars(abstract) > ABSTRACT_MAX_CHARS) {
      return {
        valid: false,
        message: `Abstract must be at most ${ABSTRACT_MAX_CHARS} characters (current: ${countChars(abstract)}).`,
        field: 'abstract',
        fieldId: 'abstract',
      }
    }
    if (countSentences(abstract) > ABSTRACT_MAX_SENTENCES) {
      return {
        valid: false,
        message: `Abstract must be at most ${ABSTRACT_MAX_SENTENCES} sentences (current: ${countSentences(abstract)}).`,
        field: 'abstract',
        fieldId: 'abstract',
      }
    }
    if (!isValidAbstract(abstract)) {
      return { valid: false, message: 'Abstract is invalid.', field: 'abstract', fieldId: 'abstract' }
    }
  }

  if (Array.isArray(tags) && tags.length > 0) {
    if (!isValidTags(tags)) {
      const hasEmpty = tags.some((t) => !t || t.trim().length === 0)
      if (hasEmpty) return { valid: false, message: 'Tags cannot be empty.', field: 'tags', fieldId: 'tags' }
      const normalized = tags.map((t) => t.trim().toLowerCase())
      const dup = new Set(normalized).size !== normalized.length
      if (dup) return { valid: false, message: 'Duplicate tags are not allowed.', field: 'tags', fieldId: 'tags' }
      return { valid: false, message: 'Tags are invalid.', field: 'tags', fieldId: 'tags' }
    }
  }

  if (Array.isArray(authors) && authors.length > 0) {
    if (!isValidAuthors(authors)) {
      const hasMissing = authors.some((a) => !a.lastName?.trim() || !a.firstName?.trim() || !a.email?.trim())
      if (hasMissing) {
        return { valid: false, message: 'Each author requires last name, first name, and email.', field: 'authors', fieldId: 'authors' }
      }
      const hasBadEmail = authors.some((a) => !isValidEmailFormat(a.email))
      if (hasBadEmail) {
        return { valid: false, message: 'One or more authors have an invalid email.', field: 'authors', fieldId: 'authors' }
      }
      const emails = authors.map((a) => a.email.trim().toLowerCase())
      if (new Set(emails).size !== emails.length) {
        return { valid: false, message: 'Duplicate authors are not allowed.', field: 'authors', fieldId: 'authors' }
      }
      const names = authors.map((a) => `${a.firstName.trim().toLowerCase()}|${a.lastName.trim().toLowerCase()}`)
      if (new Set(names).size !== names.length) {
        return { valid: false, message: 'Duplicate authors are not allowed.', field: 'authors', fieldId: 'authors' }
      }
      return { valid: false, message: 'Authors are invalid.', field: 'authors', fieldId: 'authors' }
    }
  }

  const hasBlob = Boolean(doc?.blobUrl && doc?.fileName)
  if (hasBlob && doc?.mimeType && !isPdfMime(doc.mimeType)) {
    return { valid: false, message: 'Only PDF files are allowed.', field: 'document', fieldId: 'upload-document' }
  }

  return { valid: true, message: '', field: null, fieldId: null }
}

function focusFirstInvalid(fieldId: string | null, field: keyof FieldErrors | null) {
  if (!fieldId) return
  // Defer to next tick so DOM is ready and error state rendered
  setTimeout(() => {
    // Try direct id first
    const direct = document.getElementById(fieldId)
    if (direct) {
      direct.focus()
      direct.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // Fallback for authors: focus first author input
    if (field === 'authors') {
      const first = document.querySelector<HTMLInputElement>('[aria-label="Author 1 last name"]')
      if (first) {
        first.focus()
        first.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      // Fallback container
      const container = document.getElementById('authors')
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    // For tags, ensure input focused
    if (field === 'tags') {
      const input = document.getElementById('tags') as HTMLInputElement | null
      if (input) {
        input.focus()
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    // For document, focus hidden input or container button
    if (field === 'document') {
      const docInput = document.getElementById('upload-document') as HTMLInputElement | null
      if (docInput) {
        // The visible button is role=button with aria-label Upload
        const btn = document.querySelector<HTMLElement>('[aria-label="Upload final document"]')
        if (btn) {
          ;(btn as HTMLElement).focus()
          btn.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          docInput.focus()
        }
      }
    }
  }, 30)
}

// ───────────────────────────── hook ─────────────────────────────

export function useArchivingForm({ initialData, initialStatus }: UseArchivingFormOptions) {
  const router = useRouter()

  // Lifted controlled state — seeded from DB, order preserved via JSON
  const [title, setTitle] = useState<string>(initialData?.title ?? '')
  const [abstract, setAbstract] = useState<string>(initialData?.abstract ?? '')
  const [tags, setTags] = useState<string[]>(() => (Array.isArray(initialData?.tags) ? [...initialData!.tags] : []))
  const [authors, setAuthors] = useState<AuthorEntry[]>(() => (Array.isArray(initialData?.authorOrder) ? [...(initialData!.authorOrder as AuthorEntry[])] : []))
  const [documentValue, setDocumentValue] = useState<UploadDocumentValue | null>(() => {
    if (!initialData?.blobUrl || !initialData?.fileName) return null
    return {
      blobUrl: initialData.blobUrl,
      fileName: initialData.fileName,
      mimeType: initialData.mimeType,
      size: initialData.size,
      uploadedAt: initialData.updatedAt,
      uploadedById: (initialData as any)?.uploadedById ?? null,
      uploadedByName: (initialData as any)?.uploadedByName ?? null,
    }
  })
  const [status, setStatus] = useState<ArchivingUiStatus>(initialStatus)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  // Sync when server payload changes (draft recoverable, refresh preserves, chair approves while open)
  useEffect(() => {
    setTitle(initialData?.title ?? '')
  }, [initialData?.title])
  useEffect(() => {
    setAbstract(initialData?.abstract ?? '')
  }, [initialData?.abstract])
  useEffect(() => {
    setTags(Array.isArray(initialData?.tags) ? [...initialData!.tags] : [])
  }, [initialData?.tags])
  useEffect(() => {
    // Preserve snapshot even if group member removed — keep whatever was persisted
    setAuthors(Array.isArray(initialData?.authorOrder) ? [...(initialData!.authorOrder as AuthorEntry[])] : [])
  }, [initialData?.authorOrder])
  useEffect(() => {
    if (!initialData?.blobUrl || !initialData?.fileName) {
      setDocumentValue(null)
    } else {
      setDocumentValue({
        blobUrl: initialData.blobUrl,
        fileName: initialData.fileName,
        mimeType: initialData.mimeType,
        size: initialData.size,
        uploadedAt: initialData.updatedAt,
        uploadedById: (initialData as any)?.uploadedById ?? null,
        uploadedByName: (initialData as any)?.uploadedByName ?? null,
      })
    }
  }, [
    (initialData as any)?.blobUrl,
    (initialData as any)?.fileName,
    (initialData as any)?.mimeType,
    (initialData as any)?.size,
    (initialData as any)?.updatedAt,
    (initialData as any)?.uploadedById,
    (initialData as any)?.uploadedByName,
  ])
  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  // Derived readOnly — per PROMPT 6
  const isReadOnly = status === 'IN_REVIEW' || status === 'CAPSTONE_ARCHIVED'

  // Compute submit-disabled (all required invalid including document) — used for gradient button opacity + tooltip
  // Validates same as server: title 25w/200c, abstract 4s/600c, tags min1, authors min1 valid triple, PDF present
  const validationForSubmit = useMemo(
    () => getFirstInvalid(title, abstract, tags, authors, documentValue, true),
    [title, abstract, tags, authors, documentValue],
  )
  const isSubmitDisabled = !validationForSubmit.valid || isReadOnly

  // Save Draft — disabled when no changes from loaded draft, enabled when any change (including removals).
  // Compares current form vs initialData (the loaded draft). All empty with no draft => no changes => disabled.
  const hasChanges = useMemo(() => {
    const norm = (s: string | null | undefined) => (s ?? '').trim()
    const initialTitle = norm(initialData?.title)
    const initialAbstract = norm(initialData?.abstract)
    const currentTitle = norm(title)
    const currentAbstract = norm(abstract)
    if (currentTitle !== initialTitle) return true
    if (currentAbstract !== initialAbstract) return true

    const initialTags: string[] = Array.isArray(initialData?.tags) ? (initialData!.tags as string[]) : []
    const tagsEqual =
      initialTags.length === tags.length && initialTags.every((t, i) => t === tags[i])
    if (!tagsEqual) return true

    const normAuthor = (a: AuthorEntry) =>
      `${(a.lastName ?? '').trim().toLowerCase()}|${(a.firstName ?? '').trim().toLowerCase()}|${(a.email ?? '').trim().toLowerCase()}|${a.userId ?? ''}`
    const initialAuthors: AuthorEntry[] = Array.isArray(initialData?.authorOrder)
      ? (initialData!.authorOrder as AuthorEntry[])
      : []
    if (initialAuthors.length !== authors.length) return true
    for (let i = 0; i < initialAuthors.length; i++) {
      if (normAuthor(initialAuthors[i]!) !== normAuthor(authors[i]!)) return true
    }

    const initialBlob = (initialData as any)?.blobUrl ?? null
    const currentBlob = documentValue?.blobUrl ?? null
    if ((initialBlob ?? '') !== (currentBlob ?? '')) return true
    const initialFileName = (initialData as any)?.fileName ?? null
    const currentFileName = documentValue?.fileName ?? null
    if ((initialFileName ?? '') !== (currentFileName ?? '')) return true

    return false
  }, [title, abstract, tags, authors, documentValue, initialData])

  // Keep hasAnyInput for server guard, but Save disabled now uses hasChanges
  const hasAnyInput = useMemo(() => {
    const hasTitle = (title ?? '').trim().length > 0
    const hasAbstract = (abstract ?? '').trim().length > 0
    const hasTags = Array.isArray(tags) && tags.length > 0
    const hasAuthors = Array.isArray(authors) && authors.some((a) => a.lastName?.trim() && a.firstName?.trim() && a.email?.trim() && isValidEmailFormat(a.email.trim()))
    const hasDoc = Boolean(documentValue?.blobUrl && documentValue?.fileName)
    return hasTitle || hasAbstract || hasTags || hasAuthors || hasDoc
  }, [title, abstract, tags, authors, documentValue])

  const validationForDraft = useMemo(
    () => getFirstInvalidForDraft(title, abstract, tags, authors, documentValue),
    [title, abstract, tags, authors, documentValue],
  )
  const isSaveDraftDisabled = !hasChanges || isReadOnly || isSavingDraft

  // Clear field error for a specific field when user edits (so error disappears on fix)
  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  // Wrapped setters that also clear field errors optimistically
  const handleTitleChange = useCallback(
    (next: string) => {
      setTitle(next)
      if (fieldErrors.title) clearFieldError('title')
    },
    [fieldErrors.title, clearFieldError],
  )
  const handleAbstractChange = useCallback(
    (next: string) => {
      setAbstract(next)
      if (fieldErrors.abstract) clearFieldError('abstract')
    },
    [fieldErrors.abstract, clearFieldError],
  )
  const handleTagsChange = useCallback(
    (next: string[]) => {
      setTags(next)
      if (fieldErrors.tags) clearFieldError('tags')
    },
    [fieldErrors.tags, clearFieldError],
  )
  const handleAuthorsChange = useCallback(
    (next: AuthorEntry[]) => {
      setAuthors(next)
      if (fieldErrors.authors) clearFieldError('authors')
    },
    [fieldErrors.authors, clearFieldError],
  )
  const handleAuthorsReorder = useCallback(
    (next: AuthorEntry[]) => {
      // Drag reorder updates persisted authorOrder JSON; preserve linked vs custom via userId
      setAuthors(next)
      if (fieldErrors.authors) clearFieldError('authors')
    },
    [fieldErrors.authors, clearFieldError],
  )
  const handleDocumentChange = useCallback(
    (next: UploadDocumentValue | null) => {
      setDocumentValue(next)
      if (fieldErrors.document) clearFieldError('document')
    },
    [fieldErrors.document, clearFieldError],
  )

  // Helper: empty (required) errors are NOT shown inline — Submit is disabled when empty.
  // We still keep them for isSubmitDisabled but suppress fieldErrors display.
  const isEmptyRequiredMessage = useCallback((msg: string) => {
    return msg.includes('is required') || msg.includes('At least one')
  }, [])

  // ── Save Draft handler — lenient: allows partial, disabled when no changes from loaded draft; fail does NOT clear inputs ──
  const handleSaveDraft = useCallback(async () => {
    if (isReadOnly) {
      toast.error('Submission is locked — awaiting Program Chair approval.')
      return
    }
    if (isSavingDraft) return
    if (!hasChanges) return

    const result = validationForDraft
    if (!result.valid) {
      // Empty (required) → no inline field error (Submit disabled already handles it), but still toast per spec "Do not bypass"
      // Non-empty (limits, dup, mime) → show inline + toast
      const isEmpty = isEmptyRequiredMessage(result.message)
      if (!isEmpty) {
        const nextErrors: FieldErrors = {}
        if (result.field) nextErrors[result.field] = result.message
        setFieldErrors((prev) => ({ ...prev, ...nextErrors }))
      }
      toast.error(result.message)
      focusFirstInvalid(result.fieldId, result.field)
      return
    }

    // Valid — persist DRAFT
    setIsSavingDraft(true)
    try {
      const formData = new FormData()
      formData.set('title', (title ?? '').trim())
      formData.set('abstract', (abstract ?? '').trim())
      formData.set('tags', JSON.stringify(Array.isArray(tags) ? tags : []))
      formData.set('authorOrder', JSON.stringify(Array.isArray(authors) ? authors : []))
      if (documentValue?.blobUrl) {
        formData.set('blobUrl', documentValue.blobUrl)
        if (documentValue.fileName) formData.set('fileName', documentValue.fileName)
        if (documentValue.mimeType) formData.set('mimeType', documentValue.mimeType)
        if (documentValue.size != null) formData.set('size', String(documentValue.size))
      }

      const res = await saveArchivingDraft(null, formData)
      if (res.success) {
        toast.success('Draft saved')
        setFieldErrors({})
        router.refresh()
      } else {
        // Server validation failed — show reason, keep file (do not clear documentValue), focus first invalid
        const msg = res.message || 'Failed to save draft. Please try again.'
        // Try to map server message to field for inline display
        const serverResult = getFirstInvalid(title, abstract, tags, authors, documentValue, true)
        // If server message matches a field reason, surface it; otherwise generic document error may not map
        // We still show toast and attempt to focus
        let fallbackField: keyof FieldErrors | null = null
        let fallbackId: string | null = null
        const lower = msg.toLowerCase()
        if (lower.includes('title')) {
          fallbackField = 'title'
          fallbackId = 'research-title'
        } else if (lower.includes('abstract')) {
          fallbackField = 'abstract'
          fallbackId = 'abstract'
        } else if (lower.includes('tag')) {
          fallbackField = 'tags'
          fallbackId = 'tags'
        } else if (lower.includes('author')) {
          fallbackField = 'authors'
          fallbackId = 'authors'
        } else if (lower.includes('document') || lower.includes('pdf') || lower.includes('file')) {
          fallbackField = 'document'
          fallbackId = 'upload-document'
        }
        if (fallbackField) {
          // Suppress inline for empty (required) — Submit disabled handles it
          if (!isEmptyRequiredMessage(msg)) {
            setFieldErrors((prev) => ({ ...prev, [fallbackField!]: msg }))
          }
          focusFirstInvalid(fallbackId, fallbackField)
        } else if (!serverResult.valid && serverResult.field) {
          if (!isEmptyRequiredMessage(serverResult.message)) {
            setFieldErrors((prev) => ({ ...prev, [serverResult.field!]: serverResult.message }))
          }
          focusFirstInvalid(serverResult.fieldId, serverResult.field)
        } else {
          // Generic — still toast
        }
        toast.error(msg)
      }
    } catch {
      toast.error('Failed to save draft. Please try again.')
    } finally {
      setIsSavingDraft(false)
    }
  }, [isReadOnly, isSavingDraft, validationForDraft, title, abstract, tags, authors, documentValue, router, isEmptyRequiredMessage, hasChanges])

  // ── Submit click handler — validates then opens confirmation modal (2 tabs) ──
  const handleSubmitClick = useCallback(() => {
    if (isReadOnly) {
      toast.error('Submission is locked — awaiting Program Chair approval.')
      return
    }
    if (isSubmitting) return

    const result = validationForSubmit
    if (!result.valid) {
      // Empty → no inline (Submit disabled already), non-empty → inline + toast
      const isEmpty = isEmptyRequiredMessage(result.message)
      if (!isEmpty) {
        const nextErrors: FieldErrors = {}
        if (result.field) nextErrors[result.field] = result.message
        setFieldErrors((prev) => ({ ...prev, ...nextErrors }))
      }
      // Submit button is disabled when empty, so this toast is only for non-empty limits in practice;
      // keep it for programmatic calls.
      toast.error(result.message)
      focusFirstInvalid(result.fieldId, result.field)
      return
    }

    setFieldErrors({})
    setShowSubmitModal(true)
  }, [isReadOnly, isSubmitting, validationForSubmit, isEmptyRequiredMessage])

  // Called after modal confirms → IN_REVIEW → locks form
  const handleSubmitSuccess = useCallback(() => {
    setStatus('IN_REVIEW')
    setShowSubmitModal(false)
    // isReadOnly will derive true on next render; also refresh to get DB truth
    router.refresh()
  }, [router])

  // ── Ctrl+S / Cmd+S keyboard shortcut ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSaveCombo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
      if (!isSaveCombo) return
      // Only when not readOnly — do NOT trigger submit, only draft
      if (isReadOnly) return
      e.preventDefault()
      // Trigger same saveDraft handler — validate, toast, focus, persist
      // Avoid double call if already saving
      handleSaveDraft()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isReadOnly, handleSaveDraft])

  return {
    // state
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
    hasAnyInput,
    hasChanges,
    validationForSubmit,
    validationForDraft,
    // setters / handlers
    setTitle: handleTitleChange,
    setAbstract: handleAbstractChange,
    setTags: handleTagsChange,
    setAuthors: handleAuthorsChange,
    setAuthorsReorder: handleAuthorsReorder,
    setDocumentValue: handleDocumentChange,
    setFieldErrors,
    setIsSubmitting,
    setShowPreview,
    setShowSubmitModal,
    handleSaveDraft,
    handleSubmitClick,
    handleSubmitSuccess,
    setStatus,
  }
}
