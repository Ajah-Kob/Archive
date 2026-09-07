'use client'

import { useState, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { isValidTags } from '@/lib/archiving/validation'

interface TagChipInputProps {
  value: string[]
  onChange: (next: string[]) => void
  readOnly?: boolean
  error?: string
  id?: string
  placeholder?: string
}

/**
 * Tag chip input — Figma-faithful.
 * - container bg white border #e8ebf8 rounded-10px min-h37.5 px13 py10 flex flex-wrap gap5
 * - chips bg #f4f6ff border #e5e8ff rounded-full px10 py3 text 12px semibold #707dff + X 10px
 * - input flex-1 min-w80 placeholder Add tag...
 * - Enter creates tag (trim, block empty, block duplicate case-insensitive via Set)
 * - Backspace when empty deletes last
 * - wrap new line (not scroll) — flex-wrap on container
 * - readOnly: gray, no add/remove, input disabled
 */
export function TagChipInput({
  value,
  onChange,
  readOnly = false,
  error: externalError,
  id = 'tags',
  placeholder = 'Add tag...',
}: TagChipInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [duplicateFlash, setDuplicateFlash] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const tags = Array.isArray(value) ? value : []

  // Normalized set for duplicate blocking (case-insensitive)
  const normalizedSet = new Set(tags.map((t) => t.trim().toLowerCase()))

  const getValidationError = useCallback((current: string[]): string | null => {
    // Use validation.ts isValidTags for client+server parity; surface specific message for UX
    // Empty (required) is NOT shown inline — Submit is disabled when empty.
    if (!isValidTags(current)) {
      if (current.length < 1) return null
      // isValidTags covers empty/duplicate — duplicate is handled as flash, empty as required
      return 'Tags are invalid.'
    }
    return null
  }, [])

  // Show external error if provided, otherwise internal required after touched / when duplicate flash not present
  const requiredError = getValidationError(tags)
  let displayError: string | null = null
  if (externalError !== undefined) {
    displayError = externalError || null
  } else if (readOnly) {
    displayError = null
  } else if (duplicateFlash) {
    displayError = duplicateFlash
  } else if (touched) {
    displayError = requiredError
  }

  // Pristine empty should not flash required until touched or attempt to add
  if (
    !touched &&
    tags.length === 0 &&
    !duplicateFlash &&
    externalError === undefined
  ) {
    displayError = null
  }

  const hasError = Boolean(displayError)
  const borderClass = hasError
    ? 'border-[#e11d48] focus-within:border-[#e11d48] focus-within:ring-2 focus-within:ring-[rgba(225,29,72,0.12)]'
    : 'border-[#e8ebf8] focus-within:border-[#707dff] focus-within:ring-2 focus-within:ring-[rgba(112,125,255,0.12)]'
  const bgClass = readOnly ? 'bg-[#fafbff] cursor-not-allowed' : 'bg-white'

  const tryAddTag = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (trimmed.length === 0) {
        // block empty — show flash briefly then clear
        setDuplicateFlash('Tag cannot be empty.')
        setTimeout(() => setDuplicateFlash(null), 1800)
        return false
      }
      const normalized = trimmed.toLowerCase()
      if (normalizedSet.has(normalized)) {
        setDuplicateFlash('Duplicate tag.')
        setTimeout(() => setDuplicateFlash(null), 1800)
        return false
      }
      const next = [...tags, trimmed]
      onChange(next)
      setDuplicateFlash(null)
      return true
    },
    [tags, onChange, normalizedSet],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim().length === 0) {
        // block empty Enter — still show required after touched
        setTouched(true)
        return
      }
      const added = tryAddTag(inputValue)
      if (added) {
        setInputValue('')
        setTouched(true)
      }
    } else if (e.key === ',') {
      // Optional: comma also adds — consistent with comma-separated paste
      e.preventDefault()
      const added = tryAddTag(inputValue)
      if (added) setInputValue('')
    } else if (
      e.key === 'Backspace' &&
      inputValue.length === 0 &&
      tags.length > 0
    ) {
      // Backspace when empty deletes last
      e.preventDefault()
      const next = tags.slice(0, -1)
      onChange(next)
      setTouched(true)
    }
  }

  const handleRemove = (index: number) => {
    if (readOnly) return
    const next = tags.filter((_, i) => i !== index)
    onChange(next)
    setTouched(true)
    // Keep focus in input for keyboard flow
    inputRef.current?.focus()
  }

  const handleContainerClick = () => {
    if (readOnly) return
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-[6px] w-full pb-[10px]">
      {/* Label — 12.5px bold #3a4170 + red * */}
      <label
        htmlFor={id}
        className="font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]"
      >
        Tags <span className="text-[#ef4444]">*</span>
      </label>
      {/* Hint — 11px #9ea8c6 */}
      <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">
        Press Enter to add. At least one required.
      </p>

      {/* Container — bg white border #e8ebf8 rounded-10px min-h37.5 px13 py10 flex flex-wrap gap5 */}
      <div
        onClick={handleContainerClick}
        className={`flex flex-wrap items-center gap-[5px] min-h-[37.5px] w-full rounded-[10px] border px-[13px] py-[10px] transition-colors ${borderClass} ${bgClass} ${readOnly ? 'opacity-90' : ''}`}
        aria-invalid={hasError}
      >
        {/* Chips — bg #f4f6ff border #e5e8ff rounded-full px10 py3 text 12px semibold #707dff */}
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-[6px] bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[10px] py-[3px] text-[12px] font-semibold leading-[16px] text-[#707dff] h-[23px] max-w-full"
          >
            <span className="truncate max-w-[180px]">{tag}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(index)
                }}
                aria-label={`Remove tag ${tag}`}
                className="shrink-0 rounded-full p-[2px] hover:bg-[rgba(112,125,255,0.12)] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)]"
              >
                <X className="size-[10px] text-[#707dff]" strokeWidth={2.5} />
              </button>
            )}
          </span>
        ))}

        {/* Input — flex-1 min-w 80px placeholder Add tag..., wraps to new line when needed */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            if (duplicateFlash) setDuplicateFlash(null)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTouched(true)}
          disabled={readOnly}
          readOnly={readOnly}
          placeholder={tags.length === 0 ? placeholder : ''}
          aria-label="Add tag"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          autoComplete="off"
          className={`flex-1 min-w-[80px] bg-transparent outline-none border-0 p-0 font-sans text-[13px] leading-[18px] placeholder:text-[#9ea8c6] ${readOnly ? 'text-[#8a93b4] cursor-not-allowed' : 'text-[#1e2145]'}`}
        />
      </div>

      {/* Inline validation — duplicate flash only; empty not shown (Submit disabled) */}
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
          <span aria-hidden="true" className="font-sans text-[11px] leading-[16px] text-transparent select-none">
            .
          </span>
        )}
      </div>
    </div>
  )
}

export default TagChipInput
