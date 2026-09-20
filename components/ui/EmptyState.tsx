'use client'

import type { ReactNode } from 'react'
import { NoSectionIcon } from '@/assets/NoSectionIcon'

interface EmptyStateProps {
  heading: string
  description: string
  variant?: 'card' | 'table'
  children?: ReactNode
}

export function EmptyState({ heading, description, variant = 'table', children }: EmptyStateProps) {
  const isTable = variant === 'table'
  return (
    <div
      className={
        isTable
          ? 'flex-1 flex flex-col items-center justify-center px-10 py-16 text-center min-h-0'
          : 'flex flex-col items-center justify-center px-10 py-16 text-center'
      }
    >
      <div className="mb-5">
        <NoSectionIcon />
      </div>
      <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] text-center mb-2">
        {heading}
      </h3>
      <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
        {description}
      </p>
      {children ? <div className="mt-6 flex justify-center">{children}</div> : null}
    </div>
  )
}
