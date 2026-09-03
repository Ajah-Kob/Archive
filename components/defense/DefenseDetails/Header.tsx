import type { ReactNode } from 'react'

type DefenseDetailsHeaderProps = {
  children?: ReactNode
}

export function DefenseDetailsHeader({
  children = 'Defense Details',
}: DefenseDetailsHeaderProps) {
  return (
    <div className="border-[#f0f2fa] border-b w-full shrink-0">
      <div className="flex items-center px-[18px] pt-[15px] pb-[16px] w-full">
        <p className="font-['Sora',sans-serif] font-bold text-[12.5px] leading-[normal] tracking-[-0.125px] text-[#1e3a8a]">
          {children}
        </p>
      </div>
    </div>
  )
}
