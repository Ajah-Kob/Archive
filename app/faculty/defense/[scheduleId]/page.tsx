import { notFound } from 'next/navigation'
import { PageLabel } from '@/components/globals/PageLabel'
import { DefenseSessionView } from '@/components/defense/DefenseSessionView'
import { getDefenseSession } from '@/lib/actions/defense'

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

      <div className="flex-1 p-[30px] flex flex-col min-h-0">
        <DefenseSessionView session={payload} />
      </div>
    </section>
  )
}
