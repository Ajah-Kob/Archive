import { PageLabel } from '@/components/globals/PageLabel'
import TemplatesPage from '@/components/templates/main/TemplatesPage'

export default async function FacultyTemplatesPage() {
  return (
    <section className="h-full flex flex-col pt-[30px] px-[30px] pb-[30px]">
      <PageLabel label="Templates" />
      <div className="flex-1 mt-3 flex flex-col min-h-0">
        <TemplatesPage />
      </div>
    </section>
  )
}