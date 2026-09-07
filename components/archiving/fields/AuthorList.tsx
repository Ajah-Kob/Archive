'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Trash2, Users, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import type { AuthorEntry } from '@/lib/archiving/validation'
import { isValidEmailFormat, isValidAuthors } from '@/lib/archiving/validation'
import {
  arrayMove,
  isDuplicateAuthorEntry,
  hasDuplicateAuthors,
} from '@/lib/archiving/author-helpers'
import { getMyWorkspace } from '@/lib/actions/groups'
import { AddStudentModal } from '@/components/milestones/archiving/AddStudentModal'

interface AuthorListProps {
  value: AuthorEntry[]
  onChange: (next: AuthorEntry[]) => void
  readOnly?: boolean
  error?: string
  onReorder?: (next: AuthorEntry[]) => void
  id?: string
}

function generateId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEmptyAuthor(): AuthorEntry {
  return { id: generateId(), lastName: '', firstName: '', email: '', userId: null }
}

function getAuthorRowError(author: AuthorEntry): string | null {
  const last = author.lastName?.trim() ?? ''
  const first = author.firstName?.trim() ?? ''
  const email = author.email?.trim() ?? ''
  if (!last && !first && !email) return null
  if (!last) return 'Last name is required.'
  if (!first) return 'First name is required.'
  if (!email) return 'Email is required.'
  if (!isValidEmailFormat(email)) return 'Invalid email format.'
  return null
}

export function AuthorList({
  value,
  onChange,
  readOnly = false,
  error: externalError,
  onReorder,
  id = 'authors',
}: AuthorListProps) {
  const rawAuthors = Array.isArray(value) ? value : []
  const weakIdMapRef = useRef<WeakMap<AuthorEntry, string>>(new WeakMap())
  const authors: AuthorEntry[] = useMemo(() => {
    return rawAuthors.map((a) => {
      if (a.id) return a
      if (weakIdMapRef.current.has(a)) {
        return { ...a, id: weakIdMapRef.current.get(a)! }
      }
      const newId = generateId()
      weakIdMapRef.current.set(a, newId)
      return { ...a, id: newId }
    })
  }, [rawAuthors])

  const { data: session } = useSession()
  const [touched, setTouched] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const pickerTargetIndexRef = useRef<number | null>(null)
  const [groupMembers, setGroupMembers] = useState<{ userId: number; name: string; email: string }[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [pendingNewIndex, setPendingNewIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const userId = session?.user?.id ? Number(session.user.id) : NaN
    if (!Number.isFinite(userId)) return
    let cancelled = false
    getMyWorkspace(userId)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.payload?.group?.members) {
          setGroupMembers(
            res.payload.group.members.map((m: any) => ({
              userId: m.userId,
              name: m.name,
              email: m.email,
            })),
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, authors.length])

  const isAllMembersSelected = (() => {
    if (groupMembers.length === 0) return false
    return groupMembers.every((m) =>
      authors.some((a) => {
        if (a.userId != null && a.userId === m.userId) return true
        const emailMatch = a.email && a.email.trim().toLowerCase() === m.email.trim().toLowerCase()
        if (emailMatch) return true
        const aName = `${(a.firstName ?? '').trim().toLowerCase()}|${(a.lastName ?? '').trim().toLowerCase()}`
        const parts = (m.name ?? '').trim().split(/\s+/).filter(Boolean)
        const mFirst = parts.slice(0, -1).join(' ').toLowerCase()
        const mLast = (parts[parts.length - 1] ?? '').toLowerCase()
        const mName = `${mFirst}|${mLast}`
        return aName && mName && aName === mName
      }),
    )
  })()

  const pickDisabled = readOnly || isAllMembersSelected

  const notifyChange = useCallback(
    (next: AuthorEntry[]) => {
      onChange(next)
      if (onReorder) onReorder(next)
    },
    [onChange, onReorder],
  )

  const overallError = (() => {
    if (externalError !== undefined) return externalError || null
    if (readOnly) return null
    if (!isValidAuthors(authors)) {
      if (authors.length === 0) return null
      if (hasDuplicateAuthors(authors)) return 'Duplicate authors are not allowed.'
    }
    return null
  })()

  const duplicateSet = (() => {
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
          (nameA !== '|' && nameA === nameB) ||
          (a.userId != null && a.userId === b.userId)
        ) {
          dupIndices.add(i)
          dupIndices.add(j)
        }
      }
    }
    return dupIndices
  })()

  const handleFieldChange = (index: number, field: keyof AuthorEntry, val: string) => {
    if (readOnly) return
    const next = [...authors]
    const current = next[index] as AuthorEntry
    next[index] = { ...current, [field]: val } as AuthorEntry
    notifyChange(next)
  }

  const handleDelete = (index: number) => {
    if (readOnly) return
    const next = authors.filter((_, i) => i !== index)
    notifyChange(next)
    setTouched(true)
    setActiveIndex(null)
    if (pendingNewIndex === index) setPendingNewIndex(null)
    else if (pendingNewIndex != null && pendingNewIndex > index) setPendingNewIndex((p) => (p != null ? p - 1 : null))
  }

  const handleAdd = () => {
    if (readOnly) return
    const next = [...authors, createEmptyAuthor()]
    notifyChange(next)
    setTouched(true)
    setPendingNewIndex(next.length - 1)
    setActiveIndex(next.length - 1)
  }

  const handlePickStudentSelect = (picked: AuthorEntry) => {
    if (isDuplicateAuthorEntry(authors, picked)) {
      setShowPicker(false)
      pickerTargetIndexRef.current = null
      return
    }
    const targetIdx = pickerTargetIndexRef.current
    if (targetIdx != null && targetIdx >= 0 && targetIdx < authors.length) {
      const next = [...authors]
      next[targetIdx] = { ...picked, id: picked.id ?? generateId() } as AuthorEntry
      notifyChange(next)
    } else {
      const withId = { ...picked, id: picked.id ?? generateId() } as AuthorEntry
      notifyChange([...authors, withId])
    }
    setTouched(true)
    setShowPicker(false)
    pickerTargetIndexRef.current = null
    setPendingNewIndex(null)
  }

  const openPickerForRow = (rowIndex: number | null) => {
    if (pickDisabled) return
    pickerTargetIndexRef.current = rowIndex
    setShowPicker(true)
    if (rowIndex != null) setActiveIndex(rowIndex)
  }

  const moveUp = (index: number) => {
    if (readOnly || index <= 0) return
    const next = arrayMove(authors, index, index - 1)
    notifyChange(next)
    setActiveIndex(index - 1)
  }
  const moveDown = (index: number) => {
    if (readOnly || index >= authors.length - 1) return
    const next = arrayMove(authors, index, index + 1)
    notifyChange(next)
    setActiveIndex(index + 1)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-[6px] w-full pb-[10px]">
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
            // No error border for empty fields — only duplicate and email format
            const hasRowError = isDuplicateRow
            const showRowError = !readOnly && isDuplicateRow
            const rowBorder = showRowError ? 'border-[#e11d48]' : activeIndex === index ? 'border-[#707dff] ring-2 ring-[rgba(112,125,255,0.15)] bg-white' : 'border-[#e8ebf8]'
            const stableKey = author.id ?? `author-${index}`
            const isActive = activeIndex === index
            // Per-field: only duplicate and invalid email format, not empty
            const lastNameInvalid = false
            const firstNameInvalid = false
            const emailInvalid = !readOnly && author.email.trim() && !isValidEmailFormat(author.email)
            const isDuplicateEmail = isDuplicateRow && authors.some((a, i) => i !== index && a.email.trim().toLowerCase() === author.email.trim().toLowerCase() && author.email.trim())
            const isDuplicateName =
              isDuplicateRow &&
              authors.some(
                (a, i) =>
                  i !== index &&
                  `${a.firstName.trim().toLowerCase()}|${a.lastName.trim().toLowerCase()}` ===
                    `${author.firstName.trim().toLowerCase()}|${author.lastName.trim().toLowerCase()}` &&
                  `${author.firstName.trim().toLowerCase()}|${author.lastName.trim().toLowerCase()}` !== '|',
              )
            return (
              <div
                key={stableKey}
                onClick={() => !readOnly && setActiveIndex(index)}
                onFocusCapture={() => !readOnly && setActiveIndex(index)}
                tabIndex={-1}
                className={`bg-[#fafbff] border rounded-[10px] px-[12px] py-[10px] flex gap-[10px] items-center w-full transition-colors ${rowBorder} ${isActive ? 'bg-white shadow-sm' : ''} ${readOnly ? 'opacity-90 cursor-default' : 'cursor-pointer'}`}
              >
                {/* Reorder arrows on the left */}
                <div className="hidden sm:flex flex-col gap-[2px] shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveUp(index)
                    }}
                    disabled={readOnly || index === 0}
                    aria-label={`Move author ${index + 1} up`}
                    className={`size-[22px] rounded-[6px] border flex items-center justify-center transition-colors ${readOnly || index === 0 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed' : 'bg-white border-[#e8ebf8] text-[#8a93b4] hover:border-[#707dff] hover:text-[#707dff] active:bg-[#f4f6ff]'}`}
                  >
                    <ChevronUp className="size-[10px]" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveDown(index)
                    }}
                    disabled={readOnly || index === authors.length - 1}
                    aria-label={`Move author ${index + 1} down`}
                    className={`size-[22px] rounded-[6px] border flex items-center justify-center transition-colors ${readOnly || index >= authors.length - 1 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed' : 'bg-white border-[#e8ebf8] text-[#8a93b4] hover:border-[#707dff] hover:text-[#707dff] active:bg-[#f4f6ff]'}`}
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
                    onBlur={() => setTouched(true)}
                    disabled={readOnly}
                    readOnly={readOnly}
                    placeholder="Lastname"
                    aria-label={`Author ${index + 1} last name`}
                    className={`flex-1 min-w-[110px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[#9ea8c6] placeholder:font-normal transition-colors ${lastNameInvalid || isDuplicateName ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} ${readOnly ? 'text-[#8a93b4] bg-[#fafbff] cursor-not-allowed' : 'text-[#1e2145]'}`}
                  />
                  <input
                    type="text"
                    value={author.firstName}
                    onChange={(e) => handleFieldChange(index, 'firstName', e.target.value)}
                    onBlur={() => setTouched(true)}
                    disabled={readOnly}
                    readOnly={readOnly}
                    placeholder="Firstname"
                    aria-label={`Author ${index + 1} first name`}
                    className={`flex-1 min-w-[110px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[#9ea8c6] placeholder:font-normal transition-colors ${firstNameInvalid || isDuplicateName ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} ${readOnly ? 'text-[#8a93b4] bg-[#fafbff] cursor-not-allowed' : 'text-[#1e2145]'}`}
                  />
                  <input
                    type="email"
                    value={author.email}
                    onChange={(e) => handleFieldChange(index, 'email', e.target.value)}
                    onBlur={() => setTouched(true)}
                    disabled={readOnly}
                    readOnly={readOnly}
                    placeholder="Email"
                    aria-label={`Author ${index + 1} email`}
                    className={`flex-1 min-w-[160px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[rgba(158,168,198,0.7)] placeholder:font-normal transition-colors ${emailInvalid || isDuplicateEmail ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} ${readOnly ? 'text-[#8a93b4] bg-[#fafbff] cursor-not-allowed' : 'text-[#1e2145]'}`}
                  />

                  <div className="flex items-center gap-[4px] shrink-0 lg:ml-1">
                    {/* Mobile up/down (visible on small screens) */}
                    <div className="flex sm:hidden flex-col gap-[2px]">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={readOnly || index === 0}
                        aria-label={`Move author ${index + 1} up mobile`}
                        className={`size-[20px] rounded-[6px] border flex items-center justify-center ${readOnly || index === 0 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6]' : 'bg-white border-[#e8ebf8] text-[#8a93b4]'}`}
                      >
                        <ChevronUp className="size-[10px]" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={readOnly || index === authors.length - 1}
                        aria-label={`Move author ${index + 1} down mobile`}
                        className={`size-[20px] rounded-[6px] border flex items-center justify-center ${readOnly || index >= authors.length - 1 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6]' : 'bg-white border-[#e8ebf8] text-[#8a93b4]'}`}
                      >
                        <ChevronDown className="size-[10px]" strokeWidth={2.5} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openPickerForRow(index)}
                      disabled={pickDisabled}
                      aria-label={`Pick student for author ${index + 1}`}
                      title={pickDisabled && !readOnly ? 'All group members already added' : 'Pick from group'}
                      onFocus={() => setActiveIndex(index)}
                      className={`size-[28px] rounded-[9px] border flex items-center justify-center shrink-0 transition-colors ${pickDisabled ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed opacity-60' : 'bg-white border-[#e8ebf8] text-[#707dff] hover:bg-[#f4f6ff] hover:border-[#d4d8f0] active:bg-[#eef0ff] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]'}`}
                    >
                      <Users className="size-[14px]" strokeWidth={2} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      disabled={readOnly}
                      aria-label={`Remove author ${index + 1}`}
                      onFocus={() => setActiveIndex(index)}
                      className={`size-[28px] rounded-[9px] border flex items-center justify-center shrink-0 transition-colors ${readOnly ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed' : 'bg-white border-[#e8ebf8] text-[#e11d48] hover:bg-[#fff1f2] hover:border-[#fecdd3] active:bg-[#ffe4e6] focus:outline-none focus:ring-2 focus:ring-[rgba(225,29,72,0.15)]'}`}
                      title="Remove author"
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
          <p id={`${id}-error`} role="alert" className="font-sans text-[11px] leading-[16px] text-[#e11d48]">
            {overallError}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={readOnly}
        aria-label="Add another author"
        className="w-full h-[38px] rounded-[10px] border border-dashed flex items-center justify-center gap-[7px] font-sans font-bold text-[12.5px] leading-[18px] transition-colors border-[#d4d8f0] text-[#707dff] bg-white hover:bg-[#f8f9ff] hover:border-[#707dff] active:bg-[#f4f6ff] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)] disabled:border-[#e8ebf8] disabled:text-[#9ea8c6] disabled:bg-[#fafbff] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="size-[14px]" strokeWidth={2.5} />
        Add Another Author
      </button>

      <button
        type="button"
        onClick={() => openPickerForRow(null)}
        disabled={pickDisabled}
        title={pickDisabled && !readOnly ? 'All group members already added' : undefined}
        className={`w-full h-[36px] rounded-[10px] border flex items-center justify-center gap-[7px] font-sans font-medium text-[12.5px] leading-[18px] transition-colors mt-[2px] ${pickDisabled ? 'border-[#e8ebf8] bg-[#fafbff] text-[#9ea8c6] cursor-not-allowed opacity-60' : 'border-[#e8ebf8] bg-[#fafbff] text-[#707dff] hover:bg-white hover:border-[#d4d8f0]'}`}
      >
        <Users className="size-[14px]" strokeWidth={2} />
        Pick from group members
      </button>

      <AddStudentModal
        isOpen={showPicker}
        onClose={() => {
          setShowPicker(false)
          pickerTargetIndexRef.current = null
        }}
        onSelect={handlePickStudentSelect}
        existingAuthors={authors}
      />
    </div>
  )
}

export default AuthorList


