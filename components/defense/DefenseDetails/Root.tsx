import type { ReactNode } from 'react'

type DefenseDetailsRootProps = {
  children: ReactNode
  className?: string
}

export function DefenseDetailsRoot({
  children,
  className,
}: DefenseDetailsRootProps) {
  return (
    <div
      className={[
        'bg-white border border-[#e8ebf8] flex flex-col items-start overflow-clip p-px rounded-[14px] w-full',
        'shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
