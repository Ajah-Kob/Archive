import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PageLabel } from '@/components/globals/PageLabel'
import { DefenseSchedulingPage as DefenseSchedulingView } from '@/components/defense/DefenseSchedulingPage'
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
    <section className="min-h-full flex flex-col pt-[30px] px-[30px] pb-[30px]">
      <PageLabel label="Defense Scheduling" />

      <div className="flex flex-col">
        <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
          Defense Scheduling
        </h1>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          Create and manage capstone defense schedules — proposal and final
          defenses — with venue, time, and a chair-and-members panel.
        </p>
      </div>

      <div className="flex-1 pb-[30px] mt-3 flex flex-col min-h-0">
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
