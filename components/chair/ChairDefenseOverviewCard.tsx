import Link from 'next/link'
import { Shield } from 'lucide-react'
import type { DefenseOverview } from '@/lib/actions/chair-dashboard'
import { ChairCard, ChairLabel } from '@/components/chair/ChairCard'

const DEFENSE = '/faculty/defense'

const OUTCOME_ROWS = [
  { key: 'approved', label: 'Approved', color: '#22c55e' },
  { key: 'minorRevision', label: 'Minor Revisions', color: '#f59e0b' },
  { key: 'majorRevision', label: 'Major Revisions', color: '#f97316' },
  { key: 'redefense', label: 'Redefense Required', color: '#ef4444' },
] as const

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(startTime: string | null): string {
  if (!startTime) return ''
  // Stored as a display string, not a Date, so pass it through untouched.
  return startTime
}

/**
 * Defense Overview — in-flight, completed, outcomes, and what's next.
 *
 * `REDEFENSE` is labelled "Redefense Required" rather than "Rejected": it says
 * what happens next, and the red bar still carries severity. The verdict enum
 * has no REJECTED member.
 */
export function ChairDefenseOverviewCard({
  data,
  message,
}: {
  data: DefenseOverview | null
  message?: string
}) {
  return (
    <ChairCard icon={Shield} title="Defense Overview" href={DEFENSE}>
      {!data ? (
        <p className="px-[20px] pb-[18px] font-sans font-medium text-[11.5px] leading-[17px] text-[#9ea8c6]">
          {message ?? 'Defense data unavailable.'}
        </p>
      ) : (
        <div className="flex flex-col gap-[14px] px-[20px] pb-[18px]">
          <div className="grid grid-cols-2 gap-[10px]">
            <OutcomeTile
              label="For Defense"
              value={data.forDefense}
              href={`${DEFENSE}?tab=upcoming`}
              tone="indigo"
            />
            <OutcomeTile
              label="Completed"
              value={data.completed}
              href={`${DEFENSE}?tab=completed`}
              tone="mint"
            />
          </div>

          <div className="flex flex-col gap-[9px]">
            <div className="flex items-center justify-between gap-2">
              <ChairLabel>Defense Outcomes</ChairLabel>
              <span className="font-sans font-semibold text-[10px] leading-[15px] text-[#b0b8d4] tabular-nums">
                {data.outcomes.total} total
              </span>
            </div>
            {OUTCOME_ROWS.map((row) => {
              const count = data.outcomes[row.key]
              const pct =
                data.outcomes.total > 0 ? Math.round((count / data.outcomes.total) * 100) : 0
              return (
                <div key={row.key} className="flex items-center gap-2">
                  <span
                    className="size-[6px] shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  <span className="w-[96px] shrink-0 truncate font-sans font-medium text-[11px] leading-[16px] text-[#5a6382]">
                    {row.label}
                  </span>
                  <span className="flex-1 min-w-0 h-[6px] rounded-[3px] bg-[#eff1fa] overflow-hidden">
                    <span
                      className="block h-full rounded-[3px] transition-all"
                      style={{ width: `${pct}%`, backgroundColor: row.color }}
                    />
                  </span>
                  <span className="w-[18px] shrink-0 text-right font-sans font-semibold text-[11px] leading-[16px] text-[#1e2145] tabular-nums">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>

          {data.upcoming.length > 0 && (
            <div className="flex flex-col gap-[6px]">
              <ChairLabel>Upcoming Defenses</ChairLabel>
              {data.upcoming.map((d) => (
                <Link
                  key={d.id}
                  href={`${DEFENSE}/${d.id}`}
                  className="flex items-center gap-2 rounded-[8px] border border-[#eef0f8] px-[9px] py-[7px] transition-colors hover:border-[#d8ddf6] hover:bg-[#fafbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707dff]"
                >
                  <span className="font-sans font-medium text-[11px] leading-[16px] text-[#5a6382] shrink-0 tabular-nums">
                    {formatDate(d.date)} {formatTime(d.startTime)}
                  </span>
                  <span className="flex-1 min-w-0 truncate font-sans font-semibold text-[11px] leading-[16px] text-[#1e2145]">
                    {d.label}
                  </span>
                  {d.sectionName && (
                    <span className="shrink-0 rounded-[5px] bg-[#eef2ff] px-[7px] py-[2px] font-sans font-semibold text-[9.5px] leading-[14px] text-[#707dff]">
                      {d.sectionName}
                    </span>
                  )}
                </Link>
              ))}
              {data.upcomingTotal > data.upcoming.length && (
                <p className="pl-[9px] font-sans font-medium text-[10.5px] leading-[15px] text-[#8a93b4]">
                  +{data.upcomingTotal - data.upcoming.length} more scheduled
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </ChairCard>
  )
}

function OutcomeTile({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: number
  href: string
  tone: 'indigo' | 'mint'
}) {
  const skin =
    tone === 'indigo'
      ? 'bg-[#f4f5ff] border-[#e6e9ff] text-[#707dff]'
      : 'bg-[#f0fdf4] border-[#dcfce7] text-[#22c55e]'

  return (
    <Link
      href={href}
      className={`flex flex-col gap-[1px] rounded-[10px] border px-[11px] py-[9px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707dff] ${skin}`}
    >
      <span className="font-sans font-semibold text-[10.5px] leading-[15px] opacity-80">
        {label}
      </span>
      <span className="font-['Sora',sans-serif] font-extrabold text-[22px] leading-[26px] tabular-nums">
        {value}
      </span>
      <span className="font-sans font-medium text-[9.5px] leading-[14px] opacity-70">groups</span>
    </Link>
  )
}
