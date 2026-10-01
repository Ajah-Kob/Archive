import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getMyWorkspace } from '@/lib/actions/groups'
import { getDefenseSessionData } from '@/lib/actions/student-defense'
import { getPastDefenseSchedules } from '@/lib/actions/defense'
import { toPastInitialItems } from '@/components/milestones/defense/pastInitialItems'
import { WORKSPACE_SLUGS, type JourneyRow } from '@/types/milestones'
import { CapstoneJourney } from '@/components/milestones/CapstoneJourney'
import { MilestoneDefenseHeader } from '@/components/milestones/defense/MilestoneDefenseHeader'
import { DefenseTabsRefreshProvider } from '@/components/milestones/defense/DefenseTabsRefreshContext'
import { DefenseTabsShell } from '@/components/milestones/defense/DefenseTabsShell'
import { LockedChapterPlaceholder } from '@/components/milestones/chapter/LockedChapterPlaceholder'
import { DefenseEmptyState } from '@/components/milestones/defense/DefenseEmptyState'

const DEFENSE_SLUGS: readonly string[] = ['proposal-defense', 'final-defense']

type PhaseLocks = Partial<Record<JourneyRow['header'], boolean>>

function resolveDefenseType(milestone: string): 'PROPOSAL' | 'FINAL' {
  return milestone === 'final-defense' ? 'FINAL' : 'PROPOSAL'
}

/**
 * Chrome shared by the two "you cannot see the workspace yet" states -- not
 * scheduled, and locked by the coordinator. Both render inside the journey rail
 * so the student can still see where they are in the capstone.
 */
function DefenseShell({
  journey,
  phaseLocks,
  activeSlug,
  children,
}: {
  journey: JourneyRow[]
  phaseLocks?: PhaseLocks
  activeSlug?: string
  children: React.ReactNode
}) {
  return (
    <section className="h-full flex min-h-0">
      <CapstoneJourney journey={journey} activeSlug={activeSlug} phaseLocks={phaseLocks} />
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-8 sm:py-[30px] flex flex-col">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default async function DefenseTabsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ milestone: string }>
}) {
  const { milestone } = await params
  if (!WORKSPACE_SLUGS.includes(milestone)) notFound()
  if (!(DEFENSE_SLUGS as readonly string[]).includes(milestone)) {
    return <>{children}</>
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) notFound()

  const [workspaceRes, defenseRes] = await Promise.all([
    getMyWorkspace(+session.user.id),
    getDefenseSessionData(resolveDefenseType(milestone)),
  ])

  const workspace = workspaceRes.success && workspaceRes.payload ? workspaceRes.payload : null
  if (!workspace?.group) notFound()
  const data = defenseRes.success && defenseRes.payload ? defenseRes.payload : null
  const phaseLocks = (workspace as { phaseLocks?: PhaseLocks }).phaseLocks

  // No schedule yet: friendly empty state instead of a raw 404. The defense
  // tab panel handles null data the same way.
  if (!data) {
    return (
      <DefenseShell journey={workspace.journey} phaseLocks={phaseLocks}>
        <DefenseEmptyState type={resolveDefenseType(milestone)} />
      </DefenseShell>
    )
  }

  // A schedule exists but the coordinator has not opened this phase. Show the
  // same locked panel as a chapter rather than bouncing to the milestone list,
  // which read as a broken link.
  const isLocked = workspace.journey.find((r) => r.slug === milestone)?.state === 'LOCKED'
  if (isLocked) {
    const label = workspace.journey.find((r) => r.slug === milestone)?.label ?? 'This milestone'
    return (
      <DefenseShell journey={workspace.journey} phaseLocks={phaseLocks} activeSlug={milestone}>
        <LockedChapterPlaceholder
          chapterLabel={label}
          hint="Please wait for your coordinator to open this defense."
        />
      </DefenseShell>
    )
  }

  // Past defenses ride along with the page — no client fetch, no drawer pop-in.
  const pastRes = await getPastDefenseSchedules(data.groupId)
  const pastInitials = pastRes.success && pastRes.payload ? toPastInitialItems(pastRes.payload) : []

  return (
    <section className="h-full flex min-h-0">
      <CapstoneJourney journey={workspace.journey} activeSlug={milestone} phaseLocks={phaseLocks} />
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <DefenseTabsRefreshProvider>
          <MilestoneDefenseHeader milestone={milestone} data={data} pastInitials={pastInitials} />
          <DefenseTabsShell defenseType={resolveDefenseType(milestone) as 'PROPOSAL' | 'FINAL'}>
            <div className="flex-1 min-h-0 flex flex-col min-w-0">{children}</div>
          </DefenseTabsShell>
        </DefenseTabsRefreshProvider>
      </div>
    </section>
  )
}
