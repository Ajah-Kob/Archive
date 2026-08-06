import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SectionCodeButton } from '@/components/my-sections/SectionCodeButton'
import { MySectionStudents } from '@/components/my-sections/MySectionStudents'
import { getCoordinatorSectionBySlug } from '@/lib/actions/sections'

export default async function MySectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const res = await getCoordinatorSectionBySlug(slug)
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  const { section, students } = payload

  return (
    <section className="min-h-full flex flex-col gap-3">
      <div className="flex flex-col">
        <Breadcrumbs
          items={[
            { label: 'ARCHIVE' },
            { label: 'My Sections' },
            { label: section.name, isActive: true },
          ]}
        />

        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
            {section.name}
          </h1>
          <Link
            href="/my-sections"
            className="flex gap-[7px] items-center h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Back to My Sections
          </Link>
        </div>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          Manage students enrolled in {section.name}, their groups, and recent
          activity.
        </p>

        <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[10px] mt-[18px]">
          <span className="flex gap-[6px] items-center font-sans font-semibold text-[13px] leading-[19.5px] text-[#6b7399]">
            <Users className="size-[13px] text-[#9ea8c6]" />
            {section.studentsCount} Students
          </span>
          <span className="flex gap-[6px] items-center font-sans font-semibold text-[13px] leading-[19.5px] text-[#6b7399]">
            <Users className="size-[13px] text-[#9ea8c6]" />
            {section.groupsCount} Groups
          </span>
          <span className="font-sans text-[12px] leading-[18px] text-[#dde0f0]">
            ·
          </span>
          <SectionCodeButton sectionId={section.id} initialCode={section.joinCode} />
        </div>
      </div>

      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <MySectionStudents students={students} />
      </div>
    </section>
  )
}
