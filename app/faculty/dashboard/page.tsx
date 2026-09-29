import { PageLabel } from '@/components/globals/PageLabel'
import { requireAdminOrProgramChair } from '@/lib/actions/guard'
import { redirect } from 'next/navigation'
import {
  getAlerts,
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
import { ChairAlertsCard } from '@/components/chair/ChairAlertsCard'
import { ChairWelcomeCallout } from '@/components/chair/ChairWelcomeCallout'

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

  // proxy.ts already gates this route, but it reads the JWT, which can be up to
  // ~60s stale. This checks the DB so a role change takes effect immediately.
  // The session is also what names the chair in the greeting below.
  const session = await requireAdminOrProgramChair()
  if (!session) redirect('/faculty')

  const [sections, capacity, phase, defense, deadlines, alerts] = await Promise.all([
    getSectionOverview(),
    getFacultyCapacity(),
    getSectionPhaseSpread(),
    getDefenseOverview(),
    getCalendarDeadlines(),
    getAlerts(),
  ])

  const chairName = session.user?.name?.trim() || 'there'
  const firstName = chairName.split(/\s+/)[0]
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    // `overflow-y-auto` makes this section its own scroll container. The app
    // shell clips (`templates/Main.tsx` sets overflow-hidden on the content
    // slot), so without this a page taller than the viewport is unreachable
    // rather than scrollable. This is the dashboard's own scroller, not a
    // shell change — that would affect 45 routes and belongs to Phase 4.
    <section className="min-h-full flex flex-col gap-[14px] pt-[30px] px-4 sm:px-[30px] pb-[30px] overflow-y-auto">
      <PageLabel label="Dashboard" />

      <ChairWelcomeCallout firstName={firstName} today={today} />

      <div className="flex flex-col gap-[10px] lg:flex-row lg:items-start">
        {/* Left — the figures. Stacks naturally below lg. */}
        <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-[10px]">
            <ChairSectionOverviewCard
              data={sections.payload}
              message={sections.success ? undefined : sections.message}
            />
            <ChairFacultyCapacityCard
              data={capacity.payload}
              message={capacity.success ? undefined : capacity.message}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-[10px]">
            <ChairDefenseOverviewCard
              data={defense.payload}
              message={defense.success ? undefined : defense.message}
            />
            <ChairSectionPhaseCard
              data={phase.payload}
              message={phase.success ? undefined : phase.message}
            />
          </div>
        </div>

        {/* Right — calendar and alerts share one rail. On mobile the page
            scrolls as a single column and this rail has no height limit, so the
            inner scroller only applies at lg where the rail is sticky and
            capped to the viewport. A nested scroller on mobile would trap the
            wheel and hide the alerts below the fold. */}
        <div className="flex w-full shrink-0 flex-col gap-[10px] lg:sticky lg:top-[10px] lg:w-[36%] lg:max-w-[440px]">
          <div className="flex flex-col gap-[10px] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:max-h-[calc(100dvh-120px)] lg:pr-[2px]">
            <ChairCalendarCard
              data={deadlines.payload}
              message={deadlines.success ? undefined : deadlines.message}
            />
            <ChairAlertsCard
              data={alerts.payload}
              message={alerts.success ? undefined : alerts.message}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
