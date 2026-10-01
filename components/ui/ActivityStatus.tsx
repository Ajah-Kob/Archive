interface ActivityStatusProps {
  status: 'active' | string
  /** Extra classes on the rendered element. Used to hide the label on narrow layouts. */
  className?: string
}

export function ActivityStatus({ status, className = '' }: ActivityStatusProps) {
  if (status === 'active') {
    return (
      <div className={`flex gap-2.5 items-center ${className}`}>
        <span className="size-[10px] rounded-full bg-[#10b981]" />
        <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#b0bacc]">Active now</span>
      </div>
    )
  }

  return (
    <span className={`font-sans font-medium text-[11px] leading-[16.5px] text-[#b0bacc] ${className}`}>
      {status}
    </span>
  )
}
