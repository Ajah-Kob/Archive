import { PageLabel } from '@/components/globals/PageLabel'
import TemplatesPage from '@/components/templates/main/TemplatesPage'

export default async function FacultyTemplatesPage() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Templates" />
      <TemplatesPage />
    </section>
  )
}
