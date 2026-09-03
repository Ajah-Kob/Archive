import type { ReactNode } from 'react'

type GhostButtonProps = {
  icon?: ReactNode
  children: ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
}

/**
 * Ghost action button — Figma 1471-6082.
 * bg #f0f2fa border #e0e3f0 32px h rounded 8px, bold 12px #5a6382.
 * Renders as <a> when href provided (View document), otherwise <button>.
 */
export function GhostButton({
  icon,
  children,
  href,
  onClick,
  disabled,
}: GhostButtonProps) {
  const className =
    'flex items-center gap-[5px] h-[32px] px-[13px] py-[6px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed'

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {icon}
        {children}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {icon}
      {children}
    </button>
  )
}
