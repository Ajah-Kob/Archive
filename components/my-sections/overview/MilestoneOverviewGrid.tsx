import type { MilestoneAvailabilityItem, SectionGroupProgress } from '@/lib/actions/sections'

// Maps MilestoneKey (Prisma enum) to JourneyRow slug.
// Drives the Groups working N/total count: a group is "working" on a
// milestone when its journey row for that slug is not LOCKED — i.e. the
// milestone is available to that group via resolveSectionAvailability.
const KEY_TO_SLUG: Record<string, string> = {
  CHAPTER_1: 'chapter-1',
  CHAPTER_2: 'chapter-2',
  CHAPTER_3: 'chapter-3',
  PROPOSAL_DEFENSE: 'proposal-defense',
  CHAPTER_4: 'chapter-4',
  CHAPTER_5: 'chapter-5',
  FINAL_DEFENSE: 'final-defense',
  ARCHIVING: 'archiving',
}

interface MilestoneOverviewGridProps {
  milestones: MilestoneAvailabilityItem[]
  groups: SectionGroupProgress[]
}

function workingCountFor(slug: string, groups: SectionGroupProgress[]): number {
  let count = 0
  for (const group of groups) {
    const row = group.journey.find((r) => r.slug === slug)
    if (row && row.state !== 'LOCKED') count += 1
  }
  return count
}

export function MilestoneOverviewGrid({ milestones, groups }: MilestoneOverviewGridProps) {
  const total = groups.length

  if (milestones.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] p-6 text-center">
        <p className="font-sans font-medium text-[13px] leading-[19.5px] text-[#8a93b4]">No milestones configured.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {milestones.map((item) => {
        const slug = KEY_TO_SLUG[item.key] ?? item.key.toLowerCase().replace(/_/g, '-')
        const working = workingCountFor(slug, groups)
        const open = item.open

        return (
          <div
            key={item.key}
            className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3 min-w-0"
          >
            {/* Top: label + phase badge */}
            <div className="flex items-start justify-between gap-3 min-w-0">
              <h4 className="font-heading font-bold text-[13px] leading-[18px] tracking-[-0.14px] text-[#1e3a8a] min-w-0 flex-1">
                {item.label}
              </h4>
              <span className="inline-flex items-center h-[20px] px-[7px] rounded-full bg-[#f7f7ff] border border-[#eceef8] font-sans font-bold text-[10px] leading-none tracking-[0.5px] uppercase text-[#707dff] shrink-0">
                {item.phase}
              </span>
            </div>

            {/* Middle: Open/Locked dot + pill */}
            <span className="inline-flex items-center gap-[6px] w-fit">
              <span
                className="size-[7px] rounded-full shrink-0"
                style={{ backgroundColor: open ? '#22c55e' : '#94a3b8' }}
                aria-hidden
              />
              <span
                className={`font-sans text-[11px] leading-[16.5px] tracking-[0.3px] ${open ? 'font-bold text-[#22c55e]' : 'font-semibold text-[#94a3b8]'}`}
              >
                {open ? 'Open' : 'Locked'}
              </span>
            </span>

            {/* Divider */}
            <div className="h-px w-full bg-[#f0f2fa]" aria-hidden />

            {/* Bottom: Groups working N/total */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans font-semibold text-[11px] leading-[16.5px] tracking-[0.35px] uppercase text-[#8a93b4]">
                Groups working
              </span>
              <span className="inline-flex items-baseline gap-1 shrink-0">
                <span className="font-sans font-extrabold text-[13px] leading-[19.5px] text-[#1e3a8a] tabular-nums">
                  {working}
                </span>
                <span className="font-sans font-semibold text-[12px] leading-[18px] text-[#8a93b4] tabular-nums">
                  /{total}
                </span>
              </span>
            </div>

            {/* Subtle progress bar — reflects working ratio, muted when locked */}
            <div className="h-[4px] w-full rounded-full bg-[#f0f2fa] overflow-hidden" aria-hidden>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: total > 0 ? `${(working / total) * 100}%` : '0%',
                  backgroundColor: open ? '#22c55e' : '#94a3b8',
                  opacity: open ? 1 : 0.55,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
