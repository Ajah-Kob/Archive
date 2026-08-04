import { Layers } from 'lucide-react'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { MySectionsHeader } from '@/components/my-sections/MySectionsHeader'
import { MySectionsList } from '@/components/my-sections/MySectionsList'
import { getCoordinatorSections } from '@/lib/actions/sections'

export default async function MySectionsPage() {
  const res = await getCoordinatorSections()
  const sections = res.success && res.payload ? res.payload : []

  return (
    <section className="min-h-full flex flex-col gap-3">
      <div className="flex flex-col">
        <Breadcrumbs
          items={[{ label: 'ARCHIVE' }, { label: 'My Sections', isActive: true }]}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex gap-[10px] items-center">
              <div className="size-9 bg-blue-500/10 rounded-lg inline-flex justify-center items-center">
                <Layers className="size-4 text-blue-500" />
              </div>
              <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
                My Sections
              </h1>
            </div>
            <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
              Create and manage your assigned capstone sections.
            </p>
          </div>

          <MySectionsHeader />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 pb-[30px]">
        <MySectionsList sections={sections} />
      </div>
    </section>
  )
}
