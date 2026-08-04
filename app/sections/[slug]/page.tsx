import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { StudentList } from '@/components/sections/students/StudentList'
import { getSectionBySlug } from '@/lib/actions/sections'

export default async function SectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const res = await getSectionBySlug(slug)
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  return (
    <section className="min-h-full flex flex-col gap-3">
      <div className="flex flex-col">
        <Breadcrumbs
          items={[
            { label: 'ARCHIVE' },
            { label: 'Sections' },
            { label: payload.section.name, isActive: true },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
            {payload.section.name}
          </h1>
          <Link
            href="/sections"
            className="flex gap-[7px] items-center h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Back to Sections
          </Link>
        </div>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          All students enrolled in {payload.section.name}, their groups, and
          recent activity.
        </p>
      </div>

      <div className="flex-1 pb-[30px]">
        <StudentList students={payload.students} />
      </div>
    </section>
  )
}
