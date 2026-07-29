import type { ReactNode } from 'react'
import { UserCog } from 'lucide-react'
import { Layers } from 'lucide-react'

interface TableListHeaderProps {
  title: string
  icon?: ReactNode
  count?: number
  countLabel?: string
  actionIcon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function TableListHeader({ onAction }: TableListHeaderProps) {
  return (
    <div className="flex gap-[10px] items-center pb-[15px] pt-[14px] px-5 border-b border-[#f0f2fa]">
      <div className="flex-1 min-w-px">
        <div className="flex gap-[10px] items-center">
          <div className="size-9 bg-blue-500/10 rounded-lg inline-flex justify-center items-center">
            <Layers className="size-4 text-blue-500" />
          </div>
          <span className="font-heading font-bold text-[13.5px] leading-[20.25px] text-[#10133a]">
            Sections
          </span>
        </div>
      </div>
      <button
        onClick={onAction}
        className="flex gap-[7px] items-center h-[37px] px-[15px] py-[9px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[13px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
      >
        <UserCog className="size-4" />
        Manage Coodinators
      </button>
    </div>
  )
}
