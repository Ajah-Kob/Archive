'use client'

import { useState } from 'react'
import {
  countChars,
  countSentences,
  ABSTRACT_MAX_CHARS,
  ABSTRACT_MAX_SENTENCES,
} from '@/lib/archiving/validation'

interface AbstractTextareaProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  id?: string
  error?: string
}

function getAbstractError(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'Abstract is required.'
  if (countChars(value) > ABSTRACT_MAX_CHARS) {
    return `Abstract must be at most ${ABSTRACT_MAX_CHARS} characters (current: ${countChars(value)}).`
  }
  if (countSentences(value) > ABSTRACT_MAX_SENTENCES) {
    return `Abstract must be at most ${ABSTRACT_MAX_SENTENCES} sentences (current: ${countSentences(value)}).`
  }
  return null
}

export function AbstractTextarea({
  value,
  onChange,
  readOnly = false,
  id = 'abstract',
  error: externalError,
}: AbstractTextareaProps) {
  const [touched, setTouched] = useState(false)
  const charCount = countChars(value)
  const sentenceCount = countSentences(value)
  const overChar = charCount > ABSTRACT_MAX_CHARS
  const overSentences = sentenceCount > ABSTRACT_MAX_SENTENCES
  const internalError = getAbstractError(value)
  let displayError: string | null = null
  if (externalError !== undefined) {
    displayError = externalError || null
  } else if (readOnly) {
    displayError = null
  } else if (overChar || overSentences) {
    displayError = internalError
  } else if (touched) {
    displayError = internalError
  }
  if (!touched && value.trim().length === 0 && !overChar && !overSentences && !externalError) {
    displayError = null
  }
  const hasError = Boolean(displayError)
  const borderClass = hasError
    ? 'border-[#e11d48] focus:border-[#e11d48] focus:ring-2 focus:ring-[rgba(225,29,72,0.12)]'
    : 'border-[#e8ebf8] focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]'
  const bgClass = readOnly ? 'bg-[#fafbff] cursor-not-allowed' : 'bg-white'
  const overLimit = overChar || overSentences
  return (
    <div className="flex flex-col gap-[6px] w-full pb-[10px]">
      <label htmlFor={id} className="font-sans font-bold text-[12.5px] leading-[18px] text-[#3a4170]">
        Abstract<span className="font-normal text-[#9ea8c6]"> / Overview</span>{' '}
        <span className="text-[#ef4444]">*</span>
      </label>
      <p className="font-sans text-[11px] leading-[14px] text-[#9ea8c6]">
        Short overview of your capstone — goals, methods, and key outcomes.
      </p>
      <div className="flex flex-col gap-0 w-full">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={readOnly}
          readOnly={readOnly}
          placeholder="Summarize your capstone objectives, methodology, and expected results..."
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : `${id}-counter`}
          maxLength={ABSTRACT_MAX_CHARS + 50}
          className={`h-[140px] min-h-[140px] w-full rounded-[9px] border p-[12px] font-sans font-normal text-[13px] leading-[21.45px] outline-none transition-colors placeholder:text-[#9ea8c6] resize-none ${borderClass} ${bgClass} ${readOnly ? 'text-[#8a93b4]' : 'text-[#1e2145]'}`}
        />
        {hasError && displayError && (
          <p id={`${id}-error`} role="alert" className="font-sans text-[11px] leading-[16px] text-[#e11d48] pt-1">
            {displayError}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-[5px] h-[22px] shrink-0">
          <span className="font-sans text-[11px] leading-[16px] text-[#9ea8c6] truncate">Recommended: 150-250 words</span>
          <span
            id={`${id}-counter`}
            aria-live="polite"
            className={`shrink-0 font-sans text-[11px] leading-[16px] tabular-nums flex items-center gap-1 ${overLimit ? 'text-[#e11d48] font-medium' : 'text-[#9ea8c6]'}`}
          >
            <span className={overSentences ? 'text-[#e11d48] font-medium' : 'text-[#9ea8c6]'}>
              {sentenceCount}/{ABSTRACT_MAX_SENTENCES} sentences
            </span>
            <span className="text-[#9ea8c6]">·</span>
            <span className={overChar ? 'text-[#e11d48] font-medium' : 'text-[#9ea8c6]'}>
              {charCount}/{ABSTRACT_MAX_CHARS}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default AbstractTextarea
