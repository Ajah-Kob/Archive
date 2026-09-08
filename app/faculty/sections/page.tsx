import SectionsOverview from '@/components/sections/main/SectionsOverview'
import { ManageCoordinatorsButton } from '@/components/sections/main/ManageCoordinatorsButton'

export default async function CoordinatorManagementPage() {
  return (
    <section className="min-h-full flex flex-col pt-[30px] px-[30px] pb-[30px]">
      <div className="flex-1 flex flex-col min-h-0">
        <SectionsOverview actions={<ManageCoordinatorsButton />} />
      </div>
    </section>
  )
}
