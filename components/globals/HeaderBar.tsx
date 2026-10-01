interface HeaderBarProps {
  children: React.ReactNode
  actions?: React.ReactNode
  /** Merged onto the root, so a caller can opt out of the default wrap
   *  (e.g. "flex-nowrap!" for a sticky single-line bar). */
  className?: string
}

export function HeaderBar({ children, actions, className = '' }: HeaderBarProps) {
  return (
    <div
      className={`flex flex-wrap h-fit items-center justify-between gap-x-[16px] gap-y-[10px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px] ${className}`}
    >
      {/* Tabs scroll sideways rather than squeezing or clipping when the
          actions claim the rest of the row. Scrollbar hidden to match the
          my-sections toolbar. No-op when the strip fits. */}
      <div className="flex items-center gap-1 min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>

      {actions && (
        <div className="flex items-center gap-[8px] shrink-0">{actions}</div>
      )}
    </div>
  )
}

// Backward compat alias — ContextBar was renamed to HeaderBar
export const ContextBar = HeaderBar
