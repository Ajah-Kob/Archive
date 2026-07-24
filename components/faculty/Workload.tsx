interface WorkloadProps {
  current: number
  max: number
}

export function Workload({ current, max }: WorkloadProps) {
  if (current === 0) {
    return (
      <span className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">
        No assigned groups
      </span>
    )
  }

  const ratio = current / max
  const isFull = current >= max
  const barColor = isFull ? '#ef4444' : '#f59e0b'
  const barWidth = Math.min(100, ratio * 100)

  return (
    <div className="flex flex-col items-start">
      <div className="flex gap-2 items-center">
        <span className="font-heading font-bold text-[12px] leading-[18px] text-[#1e2145] min-w-[28px]">
          {current}/{max}
        </span>
        <div className="bg-[#f0f2fa] h-[5px] rounded-[3px] w-[120px]">
          <div
            className="h-full rounded-[3px] opacity-80 transition-all"
            style={{ width: `${barWidth}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
      <span
        className={`font-sans text-[10.5px] leading-[15.75px] pt-[3px] ${
          isFull ? 'font-bold text-[#ef4444]' : 'font-medium text-[#b0bacc]'
        }`}
      >
        {isFull ? 'Full capacity' : `${max - current} slots available`}
      </span>
    </div>
  )
}
