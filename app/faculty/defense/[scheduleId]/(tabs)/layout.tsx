import { notFound } from 'next/navigation'
import { getDefenseSession, getPastDefenseSchedules } from '@/lib/actions/defense'
import { PageLabel } from '@/components/globals/PageLabel'
import { DefenseSessionTabsRoot } from '@/components/defense/DefenseSessionTabs'
import { toPastInitialItems } from '@/components/milestones/defense/pastInitialItems'

export default async function TabsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  const res = await getDefenseSession(parseInt(scheduleId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  // Past defenses ride along with the page — no client fetch, no drawer pop-in.
  const pastRes = await getPastDefenseSchedules(payload.groupId)
  const pastInitials = pastRes.success && pastRes.payload ? toPastInitialItems(pastRes.payload) : []

  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden">
      <PageLabel label="Defense Session" />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <DefenseSessionTabsRoot session={payload} pastInitials={pastInitials} backHref="/faculty/defense">
          {children}
        </DefenseSessionTabsRoot>
      </div>
    </section>
  )
}
