import { Layers } from 'lucide-react'
import { SectionTable } from '@/components/sections/main/SectionTable'
import { getSections } from '@/lib/actions/sections'

export default async function SectionsPage() {
  const sectionsRes = await getSections()
  const sections =
    sectionsRes.success && sectionsRes.payload ? sectionsRes.payload : []

  return (
    <section className="min-h-full flex flex-col gap-3">
      {/* Headings */}
      <div className="flex flex-col">
        {/* Headings*/}
        <div className="flex flex-col w-full">
          <div className="flex gap-[10px] items-center">
            <div className="size-9 bg-blue-500/10 rounded-lg inline-flex justify-center items-center">
              <Layers className="size-4 text-blue-500" />
            </div>
            <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
              Sections
            </h1>
          </div>
          <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
            Monitor all capstone sections, student enrollment, and group
            formation across coordinators.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 pb-[30px]">
        <SectionTable sections={sections} />
      </div>
    </section>
  )
}
