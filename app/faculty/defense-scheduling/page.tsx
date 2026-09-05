import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PageLabel } from '@/components/globals/PageLabel'
import { DefenseSchedulingPage as DefenseSchedulingView } from '@/components/defense-scheduling/DefenseSchedulingPage'
import {
  getDefenseSchedules,
  getDefenseWizardOptions,
  getFacultyForPanelists,
} from '@/lib/actions/defense'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'

export default async function DefenseSchedulingPage() {
  const session = await getServerSession(authOptions)
  const currentUserId = session?.user?.id ? Number(session.user.id) : 0

  const [schedulesRes, optionsRes, facultyRes] = await Promise.all([
    getDefenseSchedules(),
    getDefenseWizardOptions(),
    getFacultyForPanelists(),
  ])

  const schedules: DefenseSchedulePayload[] =
    schedulesRes.success && schedulesRes.payload ? schedulesRes.payload : []
  const sections =
    optionsRes.success && optionsRes.payload ? optionsRes.payload.sections : []
  const groups =
    optionsRes.success && optionsRes.payload ? optionsRes.payload.groups : []
  const faculty =
    facultyRes.success && facultyRes.payload ? facultyRes.payload : []

  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="Defense Scheduling" />

      <div className="flex-1 flex flex-col min-h-0">
        <DefenseSchedulingView
          schedules={schedules}
          sections={sections}
          groups={groups}
          faculty={faculty}
          currentUserId={currentUserId}
        />
      </div>
    </section>
  )
}
