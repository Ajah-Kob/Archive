import Link from 'next/link'
import { BellRing, CheckCircle2 } from 'lucide-react'
import type { AlertsSummary } from '@/lib/actions/chair-dashboard'
import { ChairCard } from '@/components/chair/ChairCard'

const TONE_STYLES = {
  critical: {
    dot: 'bg-[#ef4444]',
    chip: 'bg-[#fef2f2] text-[#dc2626] border-[#fee2e2]',
  },
  warning: {
    dot: 'bg-[#f59e0b]',
    chip: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
  },
  info: {
    dot: 'bg-[#707dff]',
    chip: 'bg-[#eef2ff] text-[#4f46e5] border-[#e0e7ff]',
  },
} as const

/**
 * Alerts — the work queue.
 *
 * Every row links to the page where the chair can act, so this is the one card
 * that turns the dashboard from a status display into something to work from.
 * Rows are ordered by severity: a defense whose date has passed with no verdict
 * outranks a scheduling notice, because nobody is chasing it.
 *
 * Renders inside a scrolling rail, so it stays compact and defers overflow to
 * the container rather than growing the column.
 */
export function ChairAlertsCard({
  data,
  message,
}: {
  data: AlertsSummary | null
  message?: string
}) {
  const alerts = data?.alerts ?? []
  const critical = data?.criticalCount ?? 0

  return (
    <ChairCard
      icon={BellRing}
      title="Alerts"
      viewAllLabel={critical > 0 ? `${critical} critical` : undefined}
    >
      {!data ? (
        <p className="px-[20px] pb-[18px] font-sans font-medium text-[11.5px] leading-[17px] text-[#9ea8c6]">
          {message ?? 'Alert data unavailable.'}
        </p>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-[6px] px-[20px] pb-[20px] pt-[4px]">
          <CheckCircle2 className="size-[22px] text-[#22c55e]" strokeWidth={2} />
          <p className="text-center font-sans font-medium text-[11.5px] leading-[17px] text-[#5a6382]">
            Nothing needs attention.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-[6px] px-[14px] pb-[16px]">
          {alerts.map((alert) => {
            const tone = TONE_STYLES[alert.tone]
            return (
              <li key={alert.id}>
                <Link
                  href={alert.href}
                  className="flex items-start gap-[9px] rounded-[9px] border border-transparent px-[7px] py-[7px] transition-colors hover:border-[#e6e9f8] hover:bg-[#fafbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707dff]"
                >
                  <span
                    className={`mt-[5px] size-[7px] shrink-0 rounded-full ${tone.dot}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans font-semibold text-[11.5px] leading-[16px] text-[#1e2145]">
                      {alert.message}
                    </span>
                    {alert.detail && (
                      <span className="block font-sans font-medium text-[10.5px] leading-[15px] text-[#8a93b4]">
                        {alert.detail}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </ChairCard>
  )
}
