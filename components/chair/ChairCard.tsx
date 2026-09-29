import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Shared card chrome for the Program Chair dashboard.
 *
 * Every card on this dashboard answers a question and then points at the page
 * where the chair can act on the answer, so the surface and the "View all"
 * affordance live here rather than being re-typed per card.
 *
 * Tokens match the rest of the app: `rounded-[14px]`, `border-[#eceef8]`,
 * `shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)]`.
 */

export const CARD_SURFACE =
  'bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)]'

export function ChairCard({
  icon: Icon,
  title,
  href,
  viewAllLabel = 'View All',
  children,
  className = '',
}: {
  icon: LucideIcon
  title: string
  /** When set, the title gains a "View all" link to the page that acts on it. */
  href?: string
  viewAllLabel?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`${CARD_SURFACE} flex flex-col overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 px-[20px] pt-[16px] pb-[12px] shrink-0">
        <h2 className="flex items-center gap-2 font-['Sora',sans-serif] font-bold text-[14px] leading-[20px] tracking-[-0.1px] text-[#1e2145] min-w-0">
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#eef2ff]">
            <Icon className="size-[13px] text-[#707dff]" strokeWidth={2.5} />
          </span>
          <span className="truncate">{title}</span>
        </h2>

        {href && (
          <Link
            href={href}
            className="group flex shrink-0 items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-sans font-semibold text-[11.5px] leading-[17px] text-[#707dff] transition-colors hover:bg-[#f4f5ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707dff]"
          >
            {viewAllLabel}
            <ArrowUpRight className="size-[11px] transition-transform group-hover:translate-x-px group-hover:-translate-y-px" strokeWidth={2.5} />
          </Link>
        )}
      </header>

      {children}
    </section>
  )
}

/** A single figure in a stat block. */
export function ChairStat({
  value,
  label,
  tone = 'default',
  href,
}: {
  value: number | string
  label: string
  /** `alert` renders red — reserved for figures that represent a problem. */
  tone?: 'default' | 'alert'
  href?: string
}) {
  const valueColor = tone === 'alert' ? 'text-[#ef4444]' : 'text-[#1e2145]'

  const body = (
    <>
      <span
        className={`block font-['Sora',sans-serif] font-extrabold text-[26px] leading-[30px] tracking-[-0.4px] ${valueColor}`}
      >
        {value}
      </span>
      <span className="block font-sans font-medium text-[11px] leading-[16px] text-[#8a93b4]">
        {label}
      </span>
    </>
  )

  if (!href) return <div className="flex flex-col gap-[2px] min-w-0">{body}</div>

  return (
    <Link
      href={href}
      className="flex flex-col gap-[2px] min-w-0 rounded-[8px] -mx-1 px-1 py-0.5 transition-colors hover:bg-[#f7f7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707dff]"
    >
      {body}
    </Link>
  )
}

/** A labelled proportional bar, used by the capacity and phase cards. */
export function ChairBar({
  label,
  count,
  total,
  color,
  href,
}: {
  label: string
  count: number
  total: number
  color: string
  href?: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const readout = `${count} / ${total}`

  const inner = (
    <div className="flex items-center gap-2 rounded-[6px] px-1 py-[3px] -mx-1 transition-colors hover:bg-[#f7f7ff]">
      <span className="w-[74px] shrink-0 truncate font-sans font-medium text-[11px] leading-[16px] text-[#5a6382]">
        {label}
      </span>
      <span className="flex-1 min-w-0 h-[6px] rounded-[3px] bg-[#eff1fa] overflow-hidden">
        <span
          className="block h-full rounded-[3px] transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </span>
      <span className="w-[38px] shrink-0 text-right font-sans font-semibold text-[11px] leading-[16px] text-[#5a6382] tabular-nums">
        {readout}
      </span>
    </div>
  )

  if (!href) return inner
  return (
    <Link
      href={href}
      className="block rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707dff]"
    >
      {inner}
    </Link>
  )
}

/** Small uppercase section label, e.g. "CAPACITY DISTRIBUTION". */
export function ChairLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-sans font-bold text-[9.5px] leading-[14px] uppercase tracking-[0.9px] text-[#b0b8d4]">
      {children}
    </span>
  )
}

/** Inline failure state so one bad query never blanks the whole dashboard. */
export function ChairCardError({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-[20px] py-6">
      <p className="text-center font-sans font-medium text-[11.5px] leading-[17px] text-[#9ea8c6]">
        {message}
      </p>
    </div>
  )
}
