import { PageLabel } from '@/components/globals/PageLabel'
import { EvaluationTeamsView } from '@/components/evaluation/teams/EvaluationTeamsView'
import { getEvaluations } from '@/lib/actions/evaluation'
import type { EvaluationItem } from '@/lib/actions/evaluation'

export default async function DocumentReviewPage() {
  const res = await getEvaluations()
  const items: EvaluationItem[] = res.success && res.payload ? res.payload : []

  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="Document Review" />

      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <div className="flex-1 min-h-0 pt-[16px] px-8 flex flex-col">
          <EvaluationTeamsView items={items} />
        </div>
      </div>
    </section>
  )
}
