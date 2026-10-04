import { PageLabel } from '@/components/globals/PageLabel'
import { TemplatesSkeleton } from '@/components/templates/main/TemplatesSkeleton'

/**
 * Streaming fallback for /student/templates.
 *
 * Same chrome as the admin and faculty fallbacks, but students are read-only, so
 * there is no Upload Template button, no My Uploads toggle and no floating
 * action button — matching the canUpload={false} its page.tsx passes down.
 */
export default function StudentTemplatesLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Templates" />
      <TemplatesSkeleton canUpload={false} />
    </section>
  )
}