'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

export interface ActionItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  icon?: ReactNode
}

interface ActionMenuProps {
  items: ActionItem[]
}

/**
 * Row action menu. The dropdown renders through a portal with position:fixed
 * so it is never clipped by overflow:auto/hidden ancestors (scrollable table
 * bodies). Closes on outside click and on any scroll (the anchor would detach).
 */
export function ActionMenu({ items }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      // Rough menu height (rows ~38px + padding) to flip upward near the viewport bottom.
      const estimated = items.length * 38 + 8
      const opensBelow = rect.bottom + 4 + estimated <= window.innerHeight
      setPos({
        top: opensBelow ? rect.bottom + 4 : Math.max(8, rect.top - estimated - 4),
        right: window.innerWidth - rect.right,
      })
    }
    setIsOpen((v) => !v)
  }

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
    }

    function handleScroll() {
      setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center justify-center size-[30px] rounded-[8px] border border-transparent hover:border-[#eceef8] transition-colors"
      >
        <MoreVertical className="size-[15px] text-[#8a93b4]" />
      </button>

      {isOpen &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 50 }}
          >
            <div className="bg-white border border-[#eceef8] rounded-[10px] w-[148px] py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]">
              {items.map((item, index) => (
                <div key={index}>
                  {index > 0 && <div className="mx-[10px] h-px bg-[#f0f2fa]" />}
                  <button
                    onClick={() => {
                      item.onClick()
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors flex items-center gap-[8px] ${
                      item.variant === 'danger' ? 'text-[#ef4444]' : 'text-[#3d4566]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
