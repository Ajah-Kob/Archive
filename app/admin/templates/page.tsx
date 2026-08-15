import { PageLabel } from '@/components/globals/PageLabel'
import TemplatesPage from '@/components/templates/main/TemplatesPage'

export default async function AdminTemplatesPage() {
  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="Templates" />
      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <TemplatesPage />
      </div>
    </section>
  )
}