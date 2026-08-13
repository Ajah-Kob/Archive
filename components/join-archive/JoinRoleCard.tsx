'use client'

import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface JoinRoleCardProps {
  icon: LucideIcon
  label: string
  description: string
  color: 'red' | 'indigo'
  onSelect: () => void
}

const colorMap = {
  red: {
    iconBg: 'bg-[#fe6f6f21]',
    iconColor: 'text-[#fe6f6f]',
    button: 'bg-gradient-to-br from-red-400 to-red-500',
  },
  indigo: {
    iconBg: 'bg-[#707cff17]',
    iconColor: 'text-[#707dff]',
    button: 'bg-gradient-to-br from-indigo-400 to-indigo-500',
  },
} as const

export function JoinRoleCard({
  icon: Icon,
  label,
  description,
  color,
  onSelect,
}: JoinRoleCardProps) {
  const c = colorMap[color]

  return (
    <div className="flex flex-col gap-[20px] bg-white rounded-[14px] shadow-[0px_2px_12px_rgba(112,125,255,0.06),0px_1px_3px_rgba(0,0,0,0.04)] p-[30px] w-[270px] h-fit">
      <div
        className={`flex items-center justify-center size-[48px] rounded-[13px] ${c.iconBg}`}
      >
        <Icon size={24} className={c.iconColor} />
      </div>

      <div className="flex flex-col gap-[10px]">
        <h2 className="font-['Sora',sans-serif] text-[18px] text-[#12143a]">
          {label}
        </h2>
        <p className="text-[14px] text-[#8a93b4]">{description}</p>
      </div>

      <button
        onClick={onSelect}
        className={`flex items-center justify-center gap-[7px] w-full py-[10px] rounded-[10px] text-[13.5px] font-semibold text-white cursor-pointer ${c.button} shadow-[0px_4px_14px_0px_rgba(112,125,255,0.30)]`}
      >
        {label}
        <ArrowRight size={15} />
      </button>
    </div>
  )
}
