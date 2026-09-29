'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

/** Menu placement, measured from the trigger. */
type MenuPos = { top: number; left: number; minWidth: number } | null

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
  /**
   * Stretch the trigger to the full width of its container and match the menu
   * to it, instead of sizing to the selected label. Opt-in: the audit
   * toolbar composes several filters in a row and wants them content-sized.
   */
  fullWidth?: boolean
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
  fullWidth = false,
}: FilterProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<MenuPos>(null)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // The menu renders through a portal at position:fixed. It has to: toolbars
  // put this in a horizontally scrollable row, and an absolutely-positioned
  // menu would be clipped by that ancestor's overflow.
  //
  // Only the open branch measures; clearing pos on close is a no-op, since the
  // menu is unmounted by the `open &&` guard below either way.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      // Flip to the left edge when the menu would run past the viewport.
      const left = Math.min(rect.left, window.innerWidth - rect.width - 8)
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, left),
        minWidth: rect.width,
      })
    }
    // Measuring the trigger requires reading layout, then painting the menu at
    // that position. The synchronous setState is the intended escape hatch for
    // measure-then-paint, and the layout-effect variant avoids a visible jump
    // from the wrong position.
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? options[0]?.label ?? ''

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'shrink-0'} ${className}`} ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex gap-2 items-center h-[37.5px] px-[13px] bg-white border border-[#e8ebf8] rounded-lg font-sans font-semibold text-[13px] text-[#5a6382] hover:border-[rgba(112,125,255,0.6)] transition-colors ${fullWidth ? 'w-full' : ''}`}
      >
        <span className="whitespace-nowrap">{selectedLabel}</span>
        <ChevronDown className="size-[13px] text-[#8a93b4] shrink-0" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 40 }}
          >
            <div
              role="listbox"
              aria-label={ariaLabel}
              style={{ minWidth: pos.minWidth }}
              className={`bg-white border border-[#e8ebf8] rounded-lg py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)] ${fullWidth ? 'w-full' : 'w-[180px]'}`}
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
          </div>,
          document.body,
        )}
    </div>
  )
}

export default Filter
