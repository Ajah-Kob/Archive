'use client'

import { MoreVertical } from 'lucide-react'

interface ActionButtonProps {
  onClick?: () => void
}

export function ActionButton({ onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center size-[30px] rounded-[8px] border border-transparent hover:border-[#eceef8] transition-colors"
    >
      <MoreVertical className="size-[15px] text-[#8a93b4]" />
    </button>
  )
}
