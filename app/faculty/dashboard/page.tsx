import { PageLabel } from '@/components/globals/PageLabel'
import { requireAdminOrProgramChair } from '@/lib/actions/guard'
import { redirect } from 'next/navigation'
import {
  getCalendarDeadlines,
  getDefenseOverview,
  getFacultyCapacity,
  getSectionOverview,
  getSectionPhaseSpread,
} from '@/lib/actions/chair-dashboard'
import { ChairSectionOverviewCard } from '@/components/chair/ChairSectionOverviewCard'
import { ChairFacultyCapacityCard } from '@/components/chair/ChairFacultyCapacityCard'
import { ChairSectionPhaseCard } from '@/components/chair/ChairSectionPhaseCard'
import { ChairDefenseOverviewCard } from '@/components/chair/ChairDefenseOverviewCard'
import { ChairCalendarCard } from '@/components/chair/ChairCalendarCard'

export const metadata = {
  title: 'Program Chair Dashboard',
  description: 'Program-wide overview of sections, adviser capacity, and defenses.',
}

/**
 * Program Chair dashboard.
 *
 * Read-only. Each card takes its own action result so a single failed query
 * degrades one card instead of blanking the page — the actions return
 * { success, message, payload } and never throw.
 *
 * The five reads are independent, so they are issued together rather than
 * awaited in sequence.
 */
export default async function ChairDashboardPage() {
  // proxy.ts already gates this route, but it reads the JWT, which can be up to
  // ~60s stale. This checks the DB so a role change takes effect immediately.
  if (!(await requireAdminOrProgramChair())) redirect('/faculty')

  const [sections, capacity, phase, defense, deadlines] = await Promise.all([
    getSectionOverview(),
    getFacultyCapacity(),
    getSectionPhaseSpread(),
    getDefenseOverview(),
    getCalendarDeadlines(),
  ])

  return (
    <section className="min-h-full flex flex-col gap-[10px] pt-[30px] px-4 sm:px-[30px] pb-[30px]">
      <PageLabel label="Dashboard" />

      {/* Top row — staffing and capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[10px]">
        <ChairSectionOverviewCard
          data={sections.payload}
          message={sections.success ? undefined : sections.message}
        />
        <ChairFacultyCapacityCard
          data={capacity.payload}
          message={capacity.success ? undefined : capacity.message}
        />
      </div>

      {/* Bottom row — calendar + phase spread on the left, defence on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-[10px] items-start">
        <div className="flex flex-col gap-[10px]">
          <ChairCalendarCard
            data={deadlines.payload}
            message={deadlines.success ? undefined : deadlines.message}
          />
          <ChairSectionPhaseCard
            data={phase.payload}
            message={phase.success ? undefined : phase.message}
          />
        </div>

        <ChairDefenseOverviewCard
          data={defense.payload}
          message={defense.success ? undefined : defense.message}
        />
      </div>
    </section>
  )
}
