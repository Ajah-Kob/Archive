interface CountBadgeProps {
  /** Items awaiting attention. Zero, negative, or missing renders nothing. */
  count: number | null | undefined
  /** Accessible name, e.g. "Document Review". Announced as "{label}, {count} pending". */
  label: string
  /** Visual urgency. Mirrors the chair-alert tone vocabulary. */
  tone?: 'critical' | 'info'
  /** Compact dot for icon-only contexts (minimized sidebar). Still labelled. */
  dot?: boolean
}

const TONE_CLASS = {
  critical: 'bg-[#fe6f6f]',
  info: 'bg-[#707dff]',
} as const

/**
 * Count badge for sidebar navigation and tabs.
 *
 * Matches the notification bell badge (red pill, white count). The number
 * itself carries the meaning so nothing relies on color alone; the tone only
 * echoes urgency already expressed by the count. Zero renders nothing rather
 * than a "0" pill, so a clean state is visually silent.
 */
export function CountBadge({ count, label, tone = 'critical', dot = false }: CountBadgeProps) {
  if (!count || count <= 0) return null
  const display = count > 99 ? '99+' : String(count)
  const ariaLabel = `${label}, ${display} pending`

  if (dot) {
    return (
      <span
        role="status"
        aria-label={ariaLabel}
        className={`absolute -top-[3px] -right-[3px] size-[8px] rounded-full ${TONE_CLASS[tone]} border border-white`}
      />
    )
  }

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-[10px] ${TONE_CLASS[tone]} text-white text-[10.5px] font-bold shrink-0`}
    >
      {display}
    </span>
  )
}
