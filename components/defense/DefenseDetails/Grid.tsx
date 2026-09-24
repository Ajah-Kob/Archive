import type { ReactNode } from 'react'

type DefenseDetailsGridProps = {
  children: ReactNode
  className?: string
  scrollable?: boolean
}

function buildGridClassName(className: string | undefined, scrollable: boolean): string {
  const base = [
    'w-full grid grid-cols-[repeat(1,minmax(0,1fr))] gap-[18px] p-[18px]',
  ]
  if (scrollable) base.push('overflow-y-auto max-h-[520px] flex-1 min-h-0')
  if (className) base.push(className)
  return base.join(' ')
}

export function DefenseDetailsGrid({
  children,
  className,
  scrollable = false,
}: DefenseDetailsGridProps) {
  return <div className={buildGridClassName(className, scrollable)}>{children}</div>
}
