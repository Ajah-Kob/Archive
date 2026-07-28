import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SectionTable } from '@/components/coordinator/main/SectionTable'
import { ManageCoodinatorDrawer } from '@/components/coordinator/drawer/ManageCoodinatorDrawer'
import { getSections } from '@/lib/actions/sections'

export default async function CoordinatorPage() {
  const sectionsRes = await getSections()
  const sections = sectionsRes.success && sectionsRes.payload ? sectionsRes.payload : []

  return (
    <section className="bg-[#f4f6ff] min-h-full flex flex-col gap-3 pt-[30px] px-[30px]">
      <Breadcrumbs
        items={[
          { label: 'ARCHIVE' },
          { label: 'Coordinators', isActive: true },
        ]}
      />

      <div className="flex flex-col">
        <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
          Coordinators
        </h1>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          View and manage coordinators responsible for handling capstone
          sections.
        </p>
      </div>

      <div className="flex-1 pb-[30px]">
        <SectionTable sections={sections} />
      </div>

      <ManageCoodinatorDrawer />
    </section>
  )
}
