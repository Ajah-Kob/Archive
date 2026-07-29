'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  heading: string
  description: string
}

export function EmptyState({ icon, heading, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-800">{heading}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1">{description}</p>
    </div>
  )
}
