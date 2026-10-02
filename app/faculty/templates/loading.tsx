import { PageLabel } from '@/components/globals/PageLabel'
import { TemplatesSkeleton } from '@/components/templates/main/TemplatesSkeleton'

/**
 * Streaming fallback for /faculty/templates.
 *
 * See app/admin/templates/loading.tsx — same chrome, and faculty may upload, so
 * the bar carries the Upload Template button and the My Uploads toggle.
 */
export default function FacultyTemplatesLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Templates" />
      <TemplatesSkeleton canUpload />
    </section>
  )
}