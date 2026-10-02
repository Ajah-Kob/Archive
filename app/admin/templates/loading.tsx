import { PageLabel } from '@/components/globals/PageLabel'
import { TemplatesSkeleton } from '@/components/templates/main/TemplatesSkeleton'

/**
 * Streaming fallback for /admin/templates.
 *
 * The template list is fetched dynamically, so on first navigation there was no
 * route-level loading UI. Mirrors the real page chrome — same bar, same card
 * shell, cards below `sm` and the five-column grid above it — so the swap to
 * loaded content does not reshape the page. Admins may upload, so the bar carries
 * the Upload Template button and the My Uploads toggle.
 */
export default function AdminTemplatesLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Templates" />
      <TemplatesSkeleton canUpload />
    </section>
  )
}