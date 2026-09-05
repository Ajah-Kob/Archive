import { notFound } from 'next/navigation'
import { DefenseSessionTabPanel } from '@/components/defense/DefenseSessionTabs'
import { SessionTabPanel } from '@/components/defense/SessionTabPanel'
import { getDefenseSession } from '@/lib/actions/defense'

export default async function DefenseSessionTabPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  const res = await getDefenseSession(parseInt(scheduleId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  return (
    <DefenseSessionTabPanel value="session">
      <SessionTabPanel session={payload} />
    </DefenseSessionTabPanel>
  )
}
