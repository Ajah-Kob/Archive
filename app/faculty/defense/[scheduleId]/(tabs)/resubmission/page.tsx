import { notFound } from 'next/navigation'
import { DefenseSessionTabPanel } from '@/components/defense/DefenseSessionTabs'
import { ResubmissionTabPanel } from '@/components/defense/ResubmissionTabPanel'
import { getDefenseSession } from '@/lib/actions/defense'

export default async function DefenseResubmissionTabPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  const res = await getDefenseSession(parseInt(scheduleId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  return (
    <DefenseSessionTabPanel value="resubmission">
      <ResubmissionTabPanel session={payload} />
    </DefenseSessionTabPanel>
  )
}
