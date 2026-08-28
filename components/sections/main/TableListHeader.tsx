import type { ReactNode } from 'react'
import { Layers } from 'lucide-react'

interface TableListHeaderProps {
  title: string
  icon?: ReactNode
  count?: number
  countLabel?: string
  /** Optional action rendered on the right side of the card label strip. */
  action?: ReactNode
}

export function TableListHeader({ action }: TableListHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-[15px] pt-[14px] px-5 border-b border-[#f0f2fa]">
      <div className="flex gap-[10px] items-center">
        <div className="size-9 bg-blue-500/10 rounded-lg inline-flex justify-center items-center">
          <Layers className="size-4 text-blue-500" />
        </div>
        <span className="font-heading font-bold text-[13.5px] leading-[20.25px] text-[#10133a]">
          Sections
        </span>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
