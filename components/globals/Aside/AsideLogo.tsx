'use client'

import { useAside } from '@/store/useAside'
import { PanelLeftClose, PanelLeft } from 'lucide-react'

export default function LogoAside() {
  const toggleMinimize = useAside((state) => state.toggleMinimize)
  const minimize = useAside((state) => state.minimize)

  return (
    // Header container: logo + collapse button
    <div
      className={`flex items-center h-16 border-b border-[#eceef8] shrink-0 ${
        minimize ? 'justify-center px-2' : 'gap-4.5 px-4.5'
      }`}
    >
      {!minimize && (
        <>
          {/* Logo icon: gradient circle with folder icon */}
          <div className="size-8.75 rounded-[11px] flex items-center justify-center shrink-0 shadow-[0px_4px_6px_rgba(112,125,255,0.38)]"
            style={{
              backgroundImage:
                'linear-gradient(140deg, #707dff 15.698%, #b776b7 80.738%, #fe6f6f 124.13%)',
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
          </div>

          {/* Brand name */}
          <span className="flex-1 font-['Sora',sans-serif] font-bold text-[14.5px] text-[#12143a] tracking-[2.1025px]">
            ARCHIVE
          </span>
        </>
      )}

      {/* Sidebar collapse/expand toggle */}
      <button
        onClick={toggleMinimize}
        className="bg-white border border-[#dddff0] rounded-[15px] size-7 flex items-center justify-center shadow-[0px_1px_1.5px_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors shrink-0"
      >
        {minimize ? (
          <PanelLeft size={13} className="text-[#5a6382]" />
        ) : (
          <PanelLeftClose size={13} className="text-[#5a6382]" />
        )}
      </button>
    </div>
  )
}
