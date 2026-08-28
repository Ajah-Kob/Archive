'use client'

import { Search, X } from 'lucide-react'

interface SearchBarProps {
  /** Controlled search value. */
  value: string
  /** Fired on every keystroke with the new input value. */
  onChange: (value: string) => void
  /** Placeholder shown when the input is empty. */
  placeholder?: string
  /** Accessible label for the input. */
  ariaLabel?: string
  /** When true, renders a clear ("x") button that resets the value. */
  clearable?: boolean
  /** Extra classes for the wrapping element (e.g. width constraints). */
  className?: string
}

/**
 * Reusable search input matching the Defense Scheduling toolbar style.
 * Fully controlled: the parent owns the value and decides what to do on
 * change/clear. Width is driven by the parent via `className` (the input
 * itself fills its wrapper).
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  ariaLabel = 'Search',
  clearable = false,
  className = '',
}: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8a93b4] pointer-events-none"
        strokeWidth={2}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full h-[37.5px] pl-[38px] pr-[13px] bg-white border border-[#e8ebf8] rounded-lg font-sans font-medium text-[13px] text-[#10133a] placeholder:text-[#8a93b4] outline-none focus:border-[#707dff] focus:ring-2 focus:ring-[rgba(112,125,255,0.18)] hover:border-[rgba(112,125,255,0.6)] transition-all"
      />
      {clearable && value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-[20px] rounded-full text-[#8a93b4] hover:text-[#3d4566] hover:bg-[#f0f2fa] transition-colors"
        >
          <X className="size-[13px]" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

export default SearchBar
