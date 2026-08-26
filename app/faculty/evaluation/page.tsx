import { PageLabel } from '@/components/globals/PageLabel'
import { EvaluationTabs } from '@/components/evaluation/EvaluationTabs'
import { getEvaluations } from '@/lib/actions/evaluation'
import type { EvaluationItem } from '@/lib/actions/evaluation'

export default async function EvaluationPage() {
  const res = await getEvaluations()
  const items: EvaluationItem[] =
    res.success && res.payload ? res.payload : []

  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="Evaluation" />

      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <EvaluationTabs items={items} />
      </div>
    </section>
  )
}