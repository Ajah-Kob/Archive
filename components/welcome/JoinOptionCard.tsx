'use client'

import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

interface JoinOptionCardProps {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  title: string
  description: string
  buttonText: string
  buttonGradient: string
  buttonShadow: string
  onClick: () => void
}

export function JoinOptionCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  buttonText,
  buttonGradient,
  buttonShadow,
  onClick,
}: JoinOptionCardProps) {
  return (
    <div className="flex flex-col gap-[20px] bg-white rounded-[14px] shadow-[0px_2px_12px_rgba(112,125,255,0.06),0px_1px_3px_rgba(0,0,0,0.04)] p-[30px] w-[270px] h-fit">
      <div
        className="flex items-center justify-center size-[48px] rounded-[13px]"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={24} style={{ color: iconColor }} />
      </div>

      <div className="flex flex-col gap-[10px]">
        <h2 className="font-['Sora',sans-serif] text-[18px] text-[#12143a]">
          {title}
        </h2>
        <p className="text-[14px] text-[#8a93b4]">{description}</p>
      </div>

      <button
        onClick={onClick}
        className="flex items-center justify-center gap-[7px] w-full py-[10px] rounded-[10px] text-[13.5px] font-semibold text-white cursor-pointer"
        style={{
          backgroundImage: buttonGradient,
          boxShadow: buttonShadow,
        }}
      >
        {buttonText}
        <ArrowRight size={15} />
      </button>
    </div>
  )
}
