import { notFound } from 'next/navigation'
import { PageLabel } from '@/components/globals/PageLabel'
import { DefenseSessionShell } from '@/components/defense/DefenseSessionShell'
import { getDefenseSession } from '@/lib/actions/defense'

// Page wires ContextBar (via DefenseSessionShell/DefenseSessionContextBar) +
// DocumentHistoryDrawer — same drawer component as Defense Milestones, back to /defense

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
    <section className="min-h-full flex flex-col">
      <PageLabel label="Defense Session" />

      <div className="flex-1 flex flex-col min-h-0">
        <DefenseSessionShell session={payload} backHref="/faculty/defense" />
      </div>
    </section>
  )
}
