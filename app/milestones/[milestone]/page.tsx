import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ComingSoon } from '@/components/workspace/ComingSoon'
import { JOURNEY_ROWS, WORKSPACE_SLUGS } from '@/types/milestones'

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ milestone: string }>
}) {
  const { milestone } = await params

  if (!WORKSPACE_SLUGS.includes(milestone)) notFound()

  const row = JOURNEY_ROWS.find((r) => r.slug === milestone)

  return (
    <section className="min-h-full flex flex-col gap-3 p-8">
      <div className="flex flex-col">
        <Breadcrumbs
          items={[
            { label: 'ARCHIVE' },
            { label: 'Milestones' },
            { label: row?.label ?? 'Workspace', isActive: true },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
            {row?.label ?? 'Workspace'}
          </h1>
          <Link
            href="/milestones"
            className="flex gap-[7px] items-center h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Back to Milestones
          </Link>
        </div>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          {row?.header} workspace
        </p>
      </div>

      <ComingSoon
        title={`${row?.label ?? 'This workspace'} is coming soon`}
        description={`The ${row?.header} workspace for ${row?.label.toLowerCase() ?? 'this step'} is not available yet. Track the current status of each step from the Milestones page.`}
      />
    </section>
  )
}
