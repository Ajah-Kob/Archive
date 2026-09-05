import Link from 'next/link'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionUrl?: string
  children?: ReactNode
}

// Hoisted static JSX/markup classes — defined once at module level so they are
// not re-created on every render (React best practice: hoist static JSX).
const CTA_CLASSES =
  'inline-flex items-center justify-center h-[40px] px-[18px] rounded-lg bg-[#707dff] text-white font-sans font-semibold text-[13px] transition-all hover:opacity-95 mt-6 shrink-0'

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
      {children}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionUrl,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-10 py-16 text-center">
      <IconFrame>
        <Icon className="size-5 text-[#707dff]" strokeWidth={1.75} />
      </IconFrame>
      <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#10133a] tracking-[-0.16px] mb-2">
        {title}
      </h3>
      <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] max-w-sm">
        {description}
      </p>
      {actionLabel && actionUrl ? (
        <Link href={actionUrl} className={CTA_CLASSES}>
          {actionLabel}
        </Link>
      ) : children ? (
        <div className="mt-6">{children}</div>
      ) : null}
    </div>
  )
}
