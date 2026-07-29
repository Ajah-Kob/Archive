'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'

export interface ActionItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface ActionMenuProps {
  items: ActionItem[]
}

export function ActionMenu({ items }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center size-[30px] rounded-[8px] border border-transparent hover:border-[#eceef8] transition-colors"
      >
        <MoreVertical className="size-[15px] text-[#8a93b4]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 pt-1">
          <div className="bg-white border border-[#eceef8] rounded-[10px] w-[148px] py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]">
            {items.map((item, index) => (
              <div key={index}>
                {index > 0 && <div className="mx-[10px] h-px bg-[#f0f2fa]" />}
                <button
                  onClick={() => {
                    item.onClick()
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                    item.variant === 'danger' ? 'text-[#ef4444]' : 'text-[#3d4566]'
                  }`}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
