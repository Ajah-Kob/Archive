'use client'

import { useState, useCallback, useRef } from 'react'
import { Trash2, Users, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import type { AuthorEntry } from '@/lib/archiving/validation'
import { isValidEmailFormat, isValidAuthors } from '@/lib/archiving/validation'
import {
  arrayMove,
  isDuplicateAuthorEntry,
  hasDuplicateAuthors,
} from '@/lib/archiving/author-helpers'
import { AddStudentModal } from '@/components/milestones/archiving/AddStudentModal'

interface AuthorListProps {
  value: AuthorEntry[]
  onChange: (next: AuthorEntry[]) => void
  readOnly?: boolean
  error?: string
  /** Optional explicit reorder callback; when omitted onChange handles reorder */
  onReorder?: (next: AuthorEntry[]) => void
  id?: string
}

function createEmptyAuthor(): AuthorEntry {
  return { lastName: '', firstName: '', email: '', userId: null }
}

function getAuthorRowError(author: AuthorEntry): string | null {
  const last = author.lastName?.trim() ?? ''
  const first = author.firstName?.trim() ?? ''
  const email = author.email?.trim() ?? ''
  // Empty row (all fields empty) is not shown inline — Submit disabled handles required; row is pristine.
  if (!last && !first && !email) return null
  if (!last) return 'Last name is required.'
  if (!first) return 'First name is required.'
  if (!email) return 'Email is required.'
  if (!isValidEmailFormat(email)) return 'Invalid email format.'
  return null
}

function DragHandle({ disabled }: { disabled?: boolean }) {
  // 6 dots — 3 rows x 2 cols, each dot 3px, gap 2px, container approx 14.6x9.3 per spec
  // Render as grid with vs class; when disabled, opacity reduced.
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 flex items-center justify-center rounded-[4px] ${disabled ? 'opacity-40' : 'opacity-60 hover:opacity-100'} transition-opacity`}
      style={{ width: 14.6, height: 20 }}
    >
      <div className="grid grid-cols-2 gap-[2px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`size-[3px] rounded-full ${disabled ? 'bg-[#9ea8c6]' : 'bg-[#8a93b4]'} `}
          />
        ))}
      </div>
    </div>
  )
}

export function AuthorList({
  value,
  onChange,
  readOnly = false,
  error: externalError,
  onReorder,
  id = 'authors',
}: AuthorListProps) {
  const authors = Array.isArray(value) ? value : []
  const [touched, setTouched] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  // For focus trap / row picker index — if null, picker adds at end; if number, replaces that row
  const pickerTargetIndexRef = useRef<number | null>(null)

  const notifyChange = useCallback(
    (next: AuthorEntry[]) => {
      onChange(next)
      if (onReorder) onReorder(next)
    },
    [onChange, onReorder],
  )

  // Validation — use validation.ts isValidAuthors for client+server parity
  // Empty (required) is NOT shown inline — Submit is disabled when empty.
  const overallError = (() => {
    if (externalError !== undefined) return externalError || null
    if (readOnly) return null
    if (!isValidAuthors(authors)) {
      if (authors.length === 0) return null
      if (hasDuplicateAuthors(authors))
        return 'Duplicate authors are not allowed.'
      // Check each row has required fields when touched or when any field partially filled
      const hasRowError = authors.some((a) => getAuthorRowError(a) !== null)
      if (hasRowError && touched) {
        // Prefer per-row inline, but show overall if duplicate not present
        return null
      }
      // Fallback to generic invalid message if touched and still invalid
      if (touched) return 'Authors are invalid.'
    }
    return null
  })()

  // If external error not provided but pristine, hide until touched
  const showOverallError = Boolean(overallError)
  const showMinErrorPristine =
    !touched && authors.length === 0 && !externalError && !showOverallError
      ? null
      : overallError

  // Row duplicate detection for inline highlight (already handled overall but also per row)
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

  const handleFieldChange = (
    index: number,
    field: keyof AuthorEntry,
    val: string,
  ) => {
    if (readOnly) return
    const next = [...authors]
    // Preserve userId distinction: keep linked userId even if fields edited manually (snapshot survives group removal)
    // Only clear userId if email changed? We keep it per spec: preserve distinction linked vs custom (userId null).
    // So do not auto-null userId on edit — let the entry remain linked but with updated snapshot values.
    next[index] = { ...next[index], [field]: val } as AuthorEntry
    notifyChange(next)
  }

  const handleDelete = (index: number) => {
    if (readOnly) return
    const next = authors.filter((_, i) => i !== index)
    notifyChange(next)
    setTouched(true)
  }

  const handleAdd = () => {
    if (readOnly) return
    const next = [...authors, createEmptyAuthor()]
    notifyChange(next)
    setTouched(true)
  }

  const handlePickStudentSelect = (picked: AuthorEntry) => {
    // Block duplicate before adding
    if (isDuplicateAuthorEntry(authors, picked)) {
      // Do not close modal? But spec says block duplicate — we just ignore and close with no add.
      // AddStudentModal already filters, so this is a guard.
      setShowPicker(false)
      pickerTargetIndexRef.current = null
      return
    }
    const targetIdx = pickerTargetIndexRef.current
    if (targetIdx != null && targetIdx >= 0 && targetIdx < authors.length) {
      // Replace the target row with picked student (preserve order)
      const next = [...authors]
      next[targetIdx] = picked
      notifyChange(next)
    } else {
      // Append
      notifyChange([...authors, picked])
    }
    setTouched(true)
    setShowPicker(false)
    pickerTargetIndexRef.current = null
  }

  const openPickerForRow = (rowIndex: number | null) => {
    if (readOnly) return
    pickerTargetIndexRef.current = rowIndex
    setShowPicker(true)
  }

  // Drag & drop (HTML5) — plus up/down fallback for touch
  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    if (readOnly) {
      e.preventDefault()
      return
    }
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox
    e.dataTransfer.setData('text/plain', String(index))
    // Add drag image opacity helper
    if (e.currentTarget instanceof HTMLElement) {
      setTimeout(() => {
        e.currentTarget?.classList?.add('opacity-50')
      }, 0)
    }
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (overIndex: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (readOnly) return
    if (dragIndex == null) return
    if (overIndex !== dragOverIndex) setDragOverIndex(overIndex)
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (readOnly) return
    const from = dragIndex
    if (from == null || from === dropIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = arrayMove(authors, from, dropIndex)
    notifyChange(next)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const moveUp = (index: number) => {
    if (readOnly || index <= 0) return
    const next = arrayMove(authors, index, index - 1)
    notifyChange(next)
  }
  const moveDown = (index: number) => {
    if (readOnly || index >= authors.length - 1) return
    const next = arrayMove(authors, index, index + 1)
    notifyChange(next)
  }

  const canReorder = !readOnly && authors.length > 1

  return (
    <div className="flex flex-col gap-[6px] w-full pb-[10px]">
      {/* Label — 12.5px bold #3a4170 + red * */}
      <label className="font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]">
        Authors <span className="text-[#ef4444]">*</span>
      </label>
      {/* Hint — 11px #9ea8c6 Add all researchers... */}
      <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">
        Add all researchers involved in this study. Drag to reorder.
      </p>

      {/* Rows */}
      <div className="flex flex-col gap-[10px] w-full">
        {authors.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[#d4d8f0] bg-[#fafbff] px-[14px] py-[12px] flex items-center justify-center">
            <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6] text-center">
              No authors yet. Add at least one.
            </p>
          </div>
        ) : (
          authors.map((author, index) => {
            const rowError = getAuthorRowError(author)
            const isDuplicateRow = duplicateSet.has(index)
            const hasRowError = Boolean(rowError) || isDuplicateRow
            // Show row error only after touched or when duplicate
            const showRowError =
              !readOnly && ((touched && hasRowError) || isDuplicateRow)
            const rowBorder = showRowError
              ? 'border-[#e11d48]'
              : 'border-[#e8ebf8]'
            const isDragOver = dragOverIndex === index && dragIndex !== index
            return (
              <div
                key={`${author.userId ?? 'custom'}-${index}`}
                draggable={!readOnly}
                onDragStart={handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop(index)}
                className={`bg-[#fafbff] border rounded-[10px] px-[12px] py-[10px] flex gap-[10px] items-center w-full transition-colors ${rowBorder} ${isDragOver ? 'ring-2 ring-[rgba(112,125,255,0.18)] bg-white' : ''} ${dragIndex === index ? 'opacity-60' : ''} ${readOnly ? 'opacity-90' : ''}`}
              >
                {/* Drag handle — 14.6x9.3 6 dots — row is draggable, handle is visual grip */}
                <div
                  aria-hidden="true"
                  className={`shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-manipulation select-none ${readOnly ? 'opacity-40 cursor-not-allowed' : 'opacity-60 hover:opacity-100'}`}
                  style={{ width: 14.6, height: 20 }}
                >
                  <DragHandle disabled={readOnly} />
                </div>

                {/* Author N label — 11px medium #9ea8c6 */}
                <span className="shrink-0 font-sans font-medium text-[11px] leading-[14px] text-[#9ea8c6] min-w-[56px]">
                  Author {index + 1}:
                </span>

                {/* 3 inputs + actions — on mobile, wrap to new lines */}
                <div className="flex-1 min-w-0 flex flex-wrap lg:flex-nowrap gap-[8px] items-center">
                  {/* Lastname */}
                  <input
                    type="text"
                    value={author.lastName}
                    onChange={(e) =>
                      handleFieldChange(index, 'lastName', e.target.value)
                    }
                    onBlur={() => setTouched(true)}
                    disabled={readOnly}
                    readOnly={readOnly}
                    placeholder="Lastname"
                    aria-label={`Author ${index + 1} last name`}
                    className={`flex-1 min-w-[110px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[#9ea8c6] placeholder:font-normal transition-colors ${showRowError && !author.lastName.trim() ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} ${readOnly ? 'text-[#8a93b4] bg-[#fafbff] cursor-not-allowed' : 'text-[#1e2145]'}`}
                  />
                  {/* Firstname */}
                  <input
                    type="text"
                    value={author.firstName}
                    onChange={(e) =>
                      handleFieldChange(index, 'firstName', e.target.value)
                    }
                    onBlur={() => setTouched(true)}
                    disabled={readOnly}
                    readOnly={readOnly}
                    placeholder="Firstname"
                    aria-label={`Author ${index + 1} first name`}
                    className={`flex-1 min-w-[110px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[#9ea8c6] placeholder:font-normal transition-colors ${showRowError && !author.firstName.trim() ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} ${readOnly ? 'text-[#8a93b4] bg-[#fafbff] cursor-not-allowed' : 'text-[#1e2145]'}`}
                  />
                  {/* Email — placeholder rgba 0.5 equivalent #9ea8c6/50 */}
                  <input
                    type="email"
                    value={author.email}
                    onChange={(e) =>
                      handleFieldChange(index, 'email', e.target.value)
                    }
                    onBlur={() => setTouched(true)}
                    disabled={readOnly}
                    readOnly={readOnly}
                    placeholder="Email"
                    aria-label={`Author ${index + 1} email`}
                    className={`flex-1 min-w-[160px] bg-white border rounded-[8px] h-[33px] px-[10px] font-sans font-medium text-[12.5px] leading-[16px] outline-none placeholder:text-[rgba(158,168,198,0.7)] placeholder:font-normal transition-colors ${showRowError && (!author.email.trim() || !isValidEmailFormat(author.email)) ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]' : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'} ${readOnly ? 'text-[#8a93b4] bg-[#fafbff] cursor-not-allowed' : 'text-[#1e2145]'}`}
                  />

                  {/* Up/Down for touch/accessible reorder — fallback when @dnd-kit missing */}
                  <div className="flex items-center gap-[4px] shrink-0 lg:ml-1">
                    <div className="hidden sm:flex flex-col gap-[2px]">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={readOnly || index === 0}
                        aria-label={`Move author ${index + 1} up`}
                        className={`size-[20px] rounded-[6px] border flex items-center justify-center transition-colors ${readOnly || index === 0 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed' : 'bg-white border-[#e8ebf8] text-[#8a93b4] hover:border-[#707dff] hover:text-[#707dff] active:bg-[#f4f6ff]'}`}
                      >
                        <ChevronUp className="size-[10px]" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={readOnly || index === authors.length - 1}
                        aria-label={`Move author ${index + 1} down`}
                        className={`size-[20px] rounded-[6px] border flex items-center justify-center transition-colors ${readOnly || index >= authors.length - 1 ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed' : 'bg-white border-[#e8ebf8] text-[#8a93b4] hover:border-[#707dff] hover:text-[#707dff] active:bg-[#f4f6ff]'}`}
                      >
                        <ChevronDown
                          className="size-[10px]"
                          strokeWidth={2.5}
                        />
                      </button>
                    </div>

                    {/* Pick-student button — 28px Users icon beside delete */}
                    <button
                      type="button"
                      onClick={() => openPickerForRow(index)}
                      disabled={readOnly}
                      aria-label={`Pick student for author ${index + 1}`}
                      className={`size-[28px] rounded-[9px] border flex items-center justify-center shrink-0 transition-colors ${readOnly ? 'bg-[#fafbff] border-[#e8ebf8] text-[#cbd0e6] cursor-not-allowed' : 'bg-white border-[#e8ebf8] text-[#707dff] hover:bg-[#f4f6ff] hover:border-[#d4d8f0] active:bg-[#eef0ff] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]'}`}
                      title="Pick from group"
                    >
                      <Users className="size-[14px]" strokeWidth={2} />
                    </button>

                    {/* Delete button — 28px red */}
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      disabled={readOnly}
                      aria-label={`Remove author ${index + 1}`}
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

      {/* Add Another Author — dashed border #d4d8f0 text #707dff 12.5px bold gap7 h38 rounded-10px justify-center */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={readOnly}
        aria-label="Add another author"
        className={`w-full h-[38px] rounded-[10px] border border-dashed flex items-center justify-center gap-[7px] font-sans font-bold text-[12.5px] leading-[18px] transition-colors ${readOnly ? 'border-[#e8ebf8] text-[#9ea8c6] bg-[#fafbff] cursor-not-allowed' : 'border-[#d4d8f0] text-[#707dff] bg-white hover:bg-[#f8f9ff] hover:border-[#707dff] active:bg-[#f4f6ff] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]'}`}
      >
        <Plus className="size-[14px]" strokeWidth={2.5} />
        Add Another Author
      </button>

      <button
        type="button"
        onClick={() => openPickerForRow(null)}
        className="w-full h-[36px] rounded-[10px] border border-[#e8ebf8] bg-[#fafbff] flex items-center justify-center gap-[7px] font-sans font-medium text-[12.5px] leading-[18px] text-[#707dff] hover:bg-white hover:border-[#d4d8f0] transition-colors mt-[2px]"
      >
        <Users className="size-[14px]" strokeWidth={2} />
        Pick from group members
      </button>

      {/* AddStudentModal — list current group students only, excludes already added, close on select */}
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
