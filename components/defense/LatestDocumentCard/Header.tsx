import type { ReactNode } from 'react'

type LatestDocumentCardHeaderProps = {
  children?: ReactNode
}

/**
 * Shared shell header — Figma 1471-5962.
 * px18 pt15 pb16 border-b #f0f2fa, Sora bold 12.5px #1e3a8a tracking -0.125.
 */
export function LatestDocumentCardHeader({
  children = 'Defense Document',
}: LatestDocumentCardHeaderProps) {
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
