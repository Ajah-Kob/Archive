import { PageLabel } from '@/components/globals/PageLabel'
import TemplatesPage from '@/components/templates/main/TemplatesPage'

// Students get read-only access: they can search, view and download
// capstone document templates, but never upload or remove them.
export default function StudentTemplatesPage() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Templates" />
      <TemplatesPage canUpload={false} canRemove={false} />
    </section>
  )
}
