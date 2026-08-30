import { PageLabel } from '@/components/globals/PageLabel'
import { DefensePage } from '@/components/defense/DefensePage'
import {
  getMyDefenseSchedules,
  getMyDefenseResubmissions,
} from '@/lib/actions/defense'
import type {
  MyDefenseSchedulePayload,
  DefenseResubmissionPayload,
} from '@/lib/actions/defense'

export default async function FacultyDefensePage() {
  const [schedulesRes, resubmissionsRes] = await Promise.all([
    getMyDefenseSchedules(),
    getMyDefenseResubmissions(),
  ])

  const schedules: MyDefenseSchedulePayload[] =
    schedulesRes.success && schedulesRes.payload ? schedulesRes.payload : []
  const resubmissions: DefenseResubmissionPayload[] =
    resubmissionsRes.success && resubmissionsRes.payload
      ? resubmissionsRes.payload
      : []

  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="Defense" />

      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <DefensePage schedules={schedules} resubmissions={resubmissions} />
      </div>
    </section>
  )
}