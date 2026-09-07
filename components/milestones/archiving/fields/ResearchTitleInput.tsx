'use client'

import { useState } from 'react'
import {
  countChars,
  countWords,
  TITLE_MAX_CHARS,
  TITLE_MAX_WORDS,
} from '@/lib/archiving/validation'

interface ResearchTitleInputProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  id?: string
  error?: string
  hint?: string
}

/**
 * Pure validation — mirrors lib/archiving/validation isValidTitle
 * but returns a human-readable message for inline display.
 * Empty (required) is NOT shown inline — Submit Capstone is disabled when empty,
 * so required errors are suppressed for inline display (only non-empty limits show).
 */
function getTitleError(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (countChars(value) > TITLE_MAX_CHARS) {
    return `Research title must be at most ${TITLE_MAX_CHARS} characters (current: ${countChars(value)}).`
  }
  if (countWords(value) > TITLE_MAX_WORDS) {
    return `Research title must be at most ${TITLE_MAX_WORDS} words (current: ${countWords(value)}).`
  }
  return null
}

export function ResearchTitleInput({
  value,
  onChange,
  readOnly = false,
  id = 'research-title',
  error: externalError,
  hint = 'e.g., ARCHIVE: A Centralized Platform for BSIS Capstone Management',
}: ResearchTitleInputProps) {
  const [touched, setTouched] = useState(false)

  const charCount = countChars(value)
  const overChar = charCount > TITLE_MAX_CHARS
  const overWords = countWords(value) > TITLE_MAX_WORDS

  // Show error immediately when over limit; otherwise only after blur/touch.
  // Trimmed empty only shows after touched to avoid flash on pristine form.
  const internalError = getTitleError(value)
  let displayError: string | null = null
  if (externalError !== undefined) {
    displayError = externalError || null
  } else if (readOnly) {
    displayError = null
  } else if (overChar || overWords) {
    displayError = internalError
  } else if (touched) {
    displayError = internalError
  }

  // For pristine empty value we intentionally hide required error until touched
  if (!touched && value.trim().length === 0 && !overChar && !overWords && !externalError) {
    displayError = null
  }

  const hasError = Boolean(displayError)
  const borderClass = hasError
    ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]'
    : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'
  const bgClass = readOnly ? 'bg-[#fafbff] cursor-not-allowed' : 'bg-white'

  return (
    <div className="flex flex-col gap-[6px] w-full pb-[10px]">
      {/* Label — 12.5px bold #3a4170 + red * */}
      <label
        htmlFor={id}
        className="font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]"
      >
        Research Title <span className="text-[#ef4444]">*</span>
      </label>

      {/* Hint — 11px #9ea8c6 */}
      {hint && (
        <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">{hint}</p>
      )}

      <div className="flex flex-col gap-[4px] w-full">
        {/* Input — h38 rounded-9px border #e8ebf8 px12, font medium 13px #1e2145 */}
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={readOnly}
          readOnly={readOnly}
          placeholder={hint}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : `${id}-counter`}
          // +50 allowance so user can overtype and see validation instead of being hard-blocked
          maxLength={TITLE_MAX_CHARS + 50}
          className={`h-[38px] w-full rounded-[9px] border px-[12px] font-sans font-medium text-[13px] leading-[19px] outline-none transition-colors placeholder:text-[#9ea8c6] ${borderClass} ${bgClass} ${readOnly ? 'text-[#8a93b4]' : 'text-[#1e2145]'}`}
        />

        {/* Bottom bar: error left, live counter xx/200 right-aligned 11px #9ea8c6 */}
        <div className="flex items-start justify-between gap-2 min-h-[16px]">
          <div className="flex-1 min-w-0">
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

          <span
            id={`${id}-counter`}
            aria-live="polite"
            className={`shrink-0 font-sans text-[11px] leading-[16px] tabular-nums ${overChar ? 'text-[#e11d48] font-medium' : 'text-[#9ea8c6]'}`}
          >
            {charCount}/{TITLE_MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ResearchTitleInput
