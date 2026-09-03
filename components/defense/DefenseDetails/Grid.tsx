import type { ReactNode } from 'react'

type DefenseDetailsGridProps = {
  children: ReactNode
}

export function DefenseDetailsGrid({ children }: DefenseDetailsGridProps) {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] gap-x-[12px] gap-y-[12px] px-[18px] py-[14px]">
      {children}
    </div>
  )
}
