import Link from 'next/link'
import { Shield } from 'lucide-react'
import type { DefenseOverview } from '@/lib/actions/chair-dashboard'
import { ChairCard, ChairLabel } from '@/components/chair/ChairCard'

const DEFENSE = '/faculty/defense'

const OUTCOME_ROWS = [
  { key: 'approved', label: 'Approved', short: 'Approved', color: '#22c55e' },
  { key: 'minorRevision', label: 'Minor Revisions', short: 'Minor', color: '#f59e0b' },
  { key: 'majorRevision', label: 'Major Revisions', short: 'Major', color: '#f97316' },
  { key: 'redefense', label: 'Redefense Required', short: 'Redefense', color: '#ef4444' },
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
  // Tallest column fills the plot, so the chart uses its full height even when
  // the largest outcome is a small share of the total.
  const maxOutcome = data
    ? Math.max(...OUTCOME_ROWS.map((r) => data.outcomes[r.key]))
    : 0

  return (
    <ChairCard icon={Shield} title="Defense Overview" href={DEFENSE}>
      {!data ? (
        <p className="px-[20px] pb-[18px] font-sans font-medium text-[11.5px] leading-[17px] text-[#9ea8c6]">
          {message ?? 'Defense data unavailable.'}
        </p>
      ) : (
        <div className="flex flex-col gap-[14px] px-[20px] pb-[18px]">
          {/* Tiles stack in a narrow left rail beside the chart, matching the
              Figma composition: two status tiles on the left, outcome columns
              filling the remaining width. */}
          <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-[14px] items-start">
            <div className="flex flex-col gap-[8px]">
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

            <div className="flex flex-col gap-[9px] min-w-0">
              <div className="flex items-center justify-between gap-2">
                <ChairLabel>Defense Outcomes</ChairLabel>
                <span className="font-sans font-semibold text-[10px] leading-[15px] text-[#b0b8d4] tabular-nums">
                  {data.outcomes.total} total
                </span>
              </div>
              {/* Columns rather than stacked progress bars: outcomes are a
                  composition of one total, and a column chart reads that at a
                  glance. The progress bars left 43% of the track empty on the
                  tallest row, so the card looked emptier than the data was.
                  Bars are scaled to the largest outcome so the tallest column
                  always fills the plot, while the "N total" readout above keeps
                  the share-of-whole honest. */}
              <div className="grid grid-cols-4 gap-[8px]">
                {OUTCOME_ROWS.map((row) => {
                  const count = data.outcomes[row.key]
                  const pct =
                    maxOutcome > 0 ? Math.round((count / maxOutcome) * 100) : 0
                  return (
                    <div key={row.key} className="flex flex-col items-center gap-[5px] min-w-0">
                      <span className="font-['Sora',sans-serif] font-extrabold text-[15px] leading-[19px] text-[#1e2145] tabular-nums">
                        {count}
                      </span>
                      <span className="flex h-[68px] w-full items-end justify-center">
                        <span
                          className={`block w-full max-w-[30px] rounded-t-[5px] transition-all ${count > 0 ? '' : 'opacity-0'}`}
                          style={{
                            height: `${Math.max(pct, count > 0 ? 6 : 0)}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </span>
                      <span className="text-center font-sans font-medium text-[9.5px] leading-[13px] text-[#5a6382]">
                        {row.short}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
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
      className={`flex flex-col gap-[1px] rounded-[10px] border px-[9px] py-[8px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707dff] ${skin}`}
    >
      <span className="font-sans font-semibold text-[10px] leading-[14px] opacity-80">
        {label}
      </span>
      <span className="font-['Sora',sans-serif] font-extrabold text-[21px] leading-[25px] tabular-nums">
        {value}
      </span>
      <span className="font-sans font-medium text-[9px] leading-[13px] opacity-70">groups</span>
    </Link>
  )
}
