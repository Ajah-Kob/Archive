import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getMyWorkspace } from '@/lib/actions/groups'
import { getDefenseSessionData } from '@/lib/actions/student-defense'
import { getPastDefenseSchedules } from '@/lib/actions/defense'
import { toPastInitialItems } from '@/components/milestones/defense/pastInitialItems'
import { WORKSPACE_SLUGS } from '@/types/milestones'
import { CapstoneJourney } from '@/components/milestones/CapstoneJourney'
import { MilestoneDefenseHeader } from '@/components/milestones/defense/MilestoneDefenseHeader'
import { DefenseTabsRefreshProvider } from '@/components/milestones/defense/DefenseTabsRefreshContext'
import { DefenseTabsShell } from '@/components/milestones/defense/DefenseTabsShell'
import { LockedChapterPlaceholder } from '@/components/milestones/chapter/LockedChapterPlaceholder'
import { DefenseEmptyState } from '@/components/milestones/defense/DefenseEmptyState'

const DEFENSE_SLUGS: readonly string[] = ['proposal-defense', 'final-defense']

function resolveDefenseType(milestone: string): 'PROPOSAL' | 'FINAL' {
  return milestone === 'final-defense' ? 'FINAL' : 'PROPOSAL'
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
  // No schedule yet: friendly empty state instead of a raw 404. The defense
  // tab panel handles null data the same way.
  if (!data) {
    return (
      <section className="h-full flex min-h-0">
        <CapstoneJourney journey={workspace.journey} phaseLocks={(workspace as any).phaseLocks} />
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[30px] flex flex-col">
            <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <DefenseEmptyState type={resolveDefenseType(milestone)} />
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const isLocked = workspace.journey.find((r) => r.slug === milestone)?.state === 'LOCKED'
  if (isLocked) redirect('/student/milestone')

  // Past defenses ride along with the page — no client fetch, no drawer pop-in.
  const pastRes = await getPastDefenseSchedules(data.groupId)
  const pastInitials = pastRes.success && pastRes.payload ? toPastInitialItems(pastRes.payload) : []

  return (
    <section className="h-full flex min-h-0">
      <CapstoneJourney journey={workspace.journey} activeSlug={milestone} phaseLocks={(workspace as any).phaseLocks} />
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
