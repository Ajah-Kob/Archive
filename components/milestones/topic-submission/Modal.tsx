'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 520,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
        onClick={onClose}
      />
      <div
        className="relative bg-white border border-[#e8ebf8] rounded-[16px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] p-[20px] flex flex-col max-h-[calc(100vh-3rem)]"
        style={{ width: `min(${width}px, calc(100vw - 2rem))` }}
      >
        <div className="flex items-start justify-between gap-[16px]">
          <div className="flex flex-col items-start gap-[2px]">
            <p className="font-sans font-semibold text-[13px] leading-[15.6px] text-[#10133a]">
              {title}
            </p>
            {subtitle ? (
              <p className="font-sans font-medium text-[10.5px] leading-[13.5px] text-[#9ea8c6]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center size-[28px] rounded-[10px] border border-[#e8ebf8] bg-white hover:bg-gray-50 transition-colors shrink-0"
          >
            <X className="size-[15px] text-[#5a6382]" />
          </button>
        </div>

        <div className="pt-[16px] flex flex-col gap-[14px] min-h-0 flex-1">
          {children}
        </div>

        {footer ? (
          <div className="pt-[16px] flex justify-between items-center gap-[10px]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
