'use client'

import { X } from 'lucide-react'

interface WorkspacePanelProps {
  /** Panel title shown in the header. */
  title: string
  /** Optional subtitle under the title. */
  subtitle?: string
  /** Optional count pill next to the title (e.g. comment count). */
  count?: number
  onClose: () => void
  children: React.ReactNode
}

/**
 * Shared shell for the workspace's right-side panels (Detail, Comments,
 * Versions). Renders as an INLINE column — the PDF viewer shrinks to make
 * room instead of the panel overlaying it as a fixed drawer.
 *
 * On narrow screens that inline behaviour cannot hold: at 420px the panel is
 * wider than a 375px viewport, and being `shrink-0` it never gives way, so the
 * PDF viewer was left with no width at all. Below `sm` the panel is therefore
 * taken out of flow and laid over the viewer, full width. The panel is already
 * toggled by a header button, so nothing is lost by it covering the document
 * rather than sitting beside it — and the PDF keeps its full size, which
 * stacking would not have.
 */
export function WorkspacePanel({
  title,
  subtitle,
  count,
  onClose,
  children,
}: WorkspacePanelProps) {
  return (
    <aside className="w-full max-w-[420px] sm:w-[420px] max-sm:absolute max-sm:inset-0 max-sm:z-20 shrink-0 h-full bg-white max-sm:border-t sm:border-l max-sm:border-t-0 border-[#eceef8] flex flex-col">
      <div className="flex items-start justify-between gap-[16px] px-5 py-4 border-b border-[#eceef8] shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-[8px]">
            <p className="font-heading font-bold text-[15px] leading-[22.5px] text-[#12143a] tracking-[-0.15px]">
              {title}
            </p>
            {typeof count === 'number' && count > 0 && (
              <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[8px] py-[2px] font-sans font-bold text-[10.5px] text-[#707dff]">
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4] pt-[3px]">
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
        >
          <X className="size-[13px] text-[#8a93b4]" />
        </button>
      </div>

      <div className="flex-1 min-h-0 px-5 py-4 overflow-y-auto">{children}</div>
    </aside>
  )
}
