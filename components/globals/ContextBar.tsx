interface ContextBarProps {
  children: React.ReactNode
  actions?: React.ReactNode
}

export function ContextBar({ children, actions }: ContextBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[10px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0">
      <div className="flex items-center gap-1 min-w-0">{children}</div>

      {actions && <div className="flex items-center gap-[8px] shrink-0">{actions}</div>}
    </div>
  )
}