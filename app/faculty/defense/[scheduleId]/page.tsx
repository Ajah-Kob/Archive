import { notFound } from 'next/navigation'
import { PageLabel } from '@/components/globals/PageLabel'
import { DefenseSessionShell } from '@/components/defense/DefenseSessionShell'
import { getDefenseSession } from '@/lib/actions/defense'

// Page wires ContextBar (via DefenseSessionShell/DefenseSessionContextBar) +
// DocumentHistoryDrawer — same drawer component as Defense Milestones, back to /defense
// Shell now composes DefenseSessionTabs.Root + SessionTabPanel (initial-only via submissions.filter isInitial)
// + ResubmissionTabPanel (callout + latest resubmitted !isInitial + ApprovalChecklist per-panelist).

export default async function DefenseSessionPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params

  const res = await getDefenseSession(parseInt(scheduleId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden">
      <PageLabel label="Defense Session" />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <DefenseSessionShell session={payload} backHref="/faculty/defense" />
      </div>
    </section>
  )
}
