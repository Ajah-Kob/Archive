'use client'

import { ChevronRight } from 'lucide-react'
import { usePageHeader } from '@/store/usePageHeader'

export default function HeaderBreadcrumb() {
  const label = usePageHeader((state) => state.label)

  if (!label) return null

  return (
    <div className="flex gap-[6px] items-center">
      <ChevronRight className="size-3 text-[rgba(16,19,58,0.5)]" />
      <span className="font-sans font-bold text-[12px] leading-[18px] text-[#707dff] truncate">
        {label}
      </span>
    </div>
  )
}