import { Users, Layers, UserCheck, Clock3 } from 'lucide-react'
import type { SectionGroupProgress } from '@/lib/actions/sections'

interface OverviewStatsProps {
  /** Reuses getCoordinatorSectionById payload — no extra queries. */
  studentsCount: number
  groupsCount: number
  /** Full groups array to derive adviser coverage etc. */
  groups: SectionGroupProgress[]
  /** pendingTopics.length from getCoordinatorSectionById */
  pendingTopicsCount: number
  className?: string
}

interface AtRiskStripProps {
  groups: SectionGroupProgress[]
  pendingTopicsCount: number
  className?: string
}

/**
 * OverviewStats — 4-up stats row for the section overview tab.
 *
 * Pure presentational component. No Prisma access, props only.
 * Derives all counts from the getCoordinatorSectionById payload:
 *  - studentsCount = section.studentsCount
 *  - groupsCount   = section.groupsCount (or groups.length)
 *  - advisers      = groups.filter(g => g.adviser).length (groups with an adviser)
 *  - pending       = pendingTopics.length
 *
 * Styled to match SectionTabs / SectionOverviewCard / MilestoneOverviewGrid:
 * bg-white border-[#eceef8] rounded-[14px] shadow, primary #707dff, text #1e3a8a,
 * font-sans tracking, responsive at all breakpoints.
 */
export function OverviewStats({
  studentsCount,
  groupsCount,
  groups,
  pendingTopicsCount,
  className,
}: OverviewStatsProps) {
  const advisersAssigned = groups.filter((g) => !!g.adviser).length
  const totalGroups = groupsCount ?? groups.length

  const items = [
    {
      key: 'students',
      label: 'Students',
      value: studentsCount,
      sublabel: totalGroups > 0 ? `${totalGroups} groups` : 'No groups yet',
      icon: Users,
      accent: '#707dff',
      bg: 'rgba(112,125,255,0.08)',
    },
    {
      key: 'groups',
      label: 'Groups',
      value: totalGroups,
      sublabel: `${studentsCount} students`,
      icon: Layers,
      accent: '#707dff',
      bg: 'rgba(112,125,255,0.08)',
    },
    {
      key: 'advisers',
      label: 'Advisers',
      value: advisersAssigned,
      sublabel:
        totalGroups > 0
          ? `${advisersAssigned}/${totalGroups} covered`
          : 'No groups',
      icon: UserCheck,
      accent: advisersAssigned === totalGroups && totalGroups > 0 ? '#16a34a' : '#f59e0b',
      bg:
        advisersAssigned === totalGroups && totalGroups > 0
          ? 'rgba(34,197,94,0.08)'
          : 'rgba(245,158,11,0.10)',
    },
    {
      key: 'pending',
      label: 'Pending review',
      value: pendingTopicsCount,
      sublabel: pendingTopicsCount === 0 ? 'All clear' : 'Awaiting review',
      icon: Clock3,
      accent: pendingTopicsCount > 0 ? '#f59e0b' : '#94a3b8',
      bg: pendingTopicsCount > 0 ? 'rgba(245,158,11,0.10)' : 'rgba(148,163,184,0.10)',
    },
  ] as const

  return (
    <div
      className={`bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] p-4 sm:p-5 ${className ?? ''}`}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.key}
              className="flex items-center gap-3 min-w-0 rounded-[10px] border border-[#f0f2fa] bg-[#fafbff] px-3 py-3 sm:px-4 sm:py-3.5"
            >
              <span
                className="size-9 rounded-[9px] flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: item.bg,
                  borderColor: `${item.accent}18`,
                  color: item.accent,
                }}
                aria-hidden
              >
                <Icon className="size-[18px]" strokeWidth={1.75} />
              </span>

              <span className="flex flex-col min-w-0">
                <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#8a93b4] truncate">
                  {item.label}
                </span>
                <span className="flex items-baseline gap-[5px] min-w-0">
                  <span className="font-heading font-extrabold text-[20px] leading-[1] tracking-[-0.14px] text-[#1e3a8a] tabular-nums">
                    {item.value}
                  </span>
                  <span className="font-sans font-medium text-[11px] leading-[1] text-[#8a93b4] truncate hidden sm:inline">
                    {item.sublabel}
                  </span>
                </span>
                <span className="font-sans font-medium text-[11px] leading-[1] text-[#8a93b4] sm:hidden truncate">
                  {item.sublabel}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * AtRiskStrip — simple pill list for groups needing attention.
 *
 * Pure presentational, props only. Collapsed (returns null) when no risks.
 * Derived from:
 *  - groups where adviser == null  → "No adviser: N"
 *  - groups where topicStatus === 'NEEDS_REVISION' OR any journey row state === 'NEEDS_REVISION' → "Needs revision: N"
 *  - pendingTopicsCount > 0        → "Pending: N" (also implies attention)
 *
 * Pills use the same typography as SectionTabs (font-sans bold 11px uppercase tracking 0.6px equivalent at 12px for readability).
 * Primary #707dff for pending, amber #f59e0b for adviser gap, red #ef4444 for revision.
 * The strip itself is a bg-white bordered card that wraps pills on small screens.
 */
export function AtRiskStrip({ groups, pendingTopicsCount, className }: AtRiskStripProps) {
  const noAdviser = groups.filter((g) => !g.adviser).length

  // NEEDS_REVISION comes from two sources: the denormalized topicStatus and
  // the derived journey state (chapters / archiving can also be NEEDS_REVISION).
  // Count distinct groups where either signal is present.
  const needsRevision = groups.filter(
    (g) => g.topicStatus === 'NEEDS_REVISION' || g.journey.some((r) => r.state === 'NEEDS_REVISION'),
  ).length

  const pending = pendingTopicsCount

  const pills: { label: string; tone: 'amber' | 'red' | 'primary' }[] = []
  if (noAdviser > 0) pills.push({ label: `No adviser: ${noAdviser}`, tone: 'amber' })
  if (needsRevision > 0) pills.push({ label: `Needs revision: ${needsRevision}`, tone: 'red' })
  if (pending > 0) pills.push({ label: `Pending review: ${pending}`, tone: 'primary' })

  // Collapsed when no risks — keeps the overview clean when sections are healthy.
  if (pills.length === 0) return null

  return (
    <div
      className={`bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2 shrink-0">
        <span className="size-1.5 rounded-full bg-[#f59e0b] shrink-0" aria-hidden />
        <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#8a93b4]">
          Needs attention
        </span>
        <span className="font-sans font-semibold text-[11px] leading-[16.5px] text-[#c4cadf] tabular-nums">
          {pills.length} {pills.length === 1 ? 'item' : 'items'}
        </span>
      </span>

      <span className="hidden sm:block w-px self-stretch bg-[#f0f2fa] shrink-0" aria-hidden />

      <span className="flex flex-wrap items-center gap-2 min-w-0">
        {pills.map((p) => (
          <AtRiskPill key={p.label} label={p.label} tone={p.tone} />
        ))}
      </span>
    </div>
  )
}

function AtRiskPill({ label, tone }: { label: string; tone: 'amber' | 'red' | 'primary' }) {
  const styles =
    tone === 'amber'
      ? 'bg-[rgba(245,158,11,0.10)] border-[rgba(245,158,11,0.22)] text-[#b45309]'
      : tone === 'red'
        ? 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.18)] text-[#dc2626]'
        : 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.18)] text-[#4f46e5]'

  const dot =
    tone === 'amber' ? '#f59e0b' : tone === 'red' ? '#ef4444' : '#707dff'

  return (
    <span
      className={`inline-flex items-center gap-[6px] h-[26px] px-[10px] rounded-full border font-sans font-bold text-[12px] leading-none ${styles}`}
    >
      <span className="size-[6px] rounded-full shrink-0" style={{ backgroundColor: dot }} aria-hidden />
      {label}
    </span>
  )
}

export default OverviewStats
