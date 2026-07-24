'use client'

import { useEffect, useRef } from 'react'

interface ActionMenuProps {
  onViewDetails?: () => void
  onRemoveFaculty?: () => void
  onClose?: () => void
}

export function ActionMenu({ onViewDetails, onRemoveFaculty, onClose }: ActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="bg-white border border-[#eceef8] rounded-[10px] w-[148px] py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]"
    >
      <button
        onClick={onViewDetails}
        className="w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] text-[#3d4566] hover:bg-[#fafbff] transition-colors"
      >
        View Details
      </button>
      <div className="mx-[10px] h-px bg-[#f0f2fa]" />
      <button
        onClick={onRemoveFaculty}
        className="w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] text-[#ef4444] hover:bg-[#fafbff] transition-colors"
      >
        Remove Faculty
      </button>
    </div>
  )
}
