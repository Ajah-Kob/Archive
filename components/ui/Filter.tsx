'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
  /** When true, renders a divider line above this option. */
  dividerBefore?: boolean
}

interface FilterProps {
  /** Currently selected option value. */
  value: string
  /** Available options for this filter. */
  options: ReadonlyArray<FilterOption>
  /** Fired when the user picks an option. */
  onChange: (value: string) => void
  /** Accessible label for the trigger and menu. */
  ariaLabel: string
  /** Extra classes for the wrapping element. */
  className?: string
}

/**
 * Reusable dropdown filter matching the Defense Scheduling toolbar style.
 * Fully controlled: the parent owns the selected value and options. Multiple
 * filters can be composed without changing this component — just pass
 * different `options`/`value`/`onChange` per instance.
 */
export function Filter({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
}: FilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? options[0]?.label ?? ''

  return (
    <div className={`relative shrink-0 ${className}`} ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex gap-2 items-center h-[37.5px] px-[13px] bg-white border border-[#e8ebf8] rounded-lg font-sans font-semibold text-[13px] text-[#5a6382] hover:border-[rgba(112,125,255,0.6)] transition-colors"
      >
        <span className="whitespace-nowrap">{selectedLabel}</span>
        <ChevronDown className="size-[13px] text-[#8a93b4]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 pt-1.5">
          <div
            role="listbox"
            aria-label={ariaLabel}
            className="bg-white border border-[#e8ebf8] rounded-lg w-[180px] py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]"
          >
            {options.map((option, index) => {
              const selected = option.value === value
              return (
                <div key={option.value}>
                  {(option.dividerBefore ?? index === 1) && (
                    <div className="mx-[10px] h-px bg-[#f0f2fa]" />
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-[13px] py-[8.5px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                      selected ? 'text-[#707dff]' : 'text-[#3d4566]'
                    }`}
                  >
                    <span className="whitespace-nowrap">{option.label}</span>
                    {selected && <Check className="size-[13px] shrink-0" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Filter
