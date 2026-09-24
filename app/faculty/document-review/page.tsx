import { PageLabel } from '@/components/globals/PageLabel'
import { EvaluationTeamsView } from '@/components/evaluation/teams/EvaluationTeamsView'
import { getEvaluations } from '@/lib/actions/evaluation'
import type { EvaluationItem } from '@/lib/actions/evaluation'

export default async function DocumentReviewPage() {
  const res = await getEvaluations()
  const items: EvaluationItem[] = res.success && res.payload ? res.payload : []

  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Document Review" />
      <EvaluationTeamsView items={items} />
    </section>
  )
}
