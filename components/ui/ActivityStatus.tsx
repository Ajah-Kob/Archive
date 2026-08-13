interface ActivityStatusProps {
  status: 'active' | string
}

export function ActivityStatus({ status }: ActivityStatusProps) {
  if (status === 'active') {
    return (
      <div className="flex gap-2.5 items-center">
        <span className="size-[10px] rounded-full bg-[#10b981]" />
        <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#b0bacc]">Active now</span>
      </div>
    )
  }

  return (
    <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#b0bacc]">{status}</span>
  )
}
