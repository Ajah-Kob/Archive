import { CoordinatorTableSkeleton } from '@/components/faculty/CoordinatorTableSkeleton'

/**
 * Streaming fallback for the legacy faculties/coordinators route.
 *
 * The page redirects to /faculty/faculty-management/coordinators immediately,
 * so this never paints — the same white panel + CoordinatorTableSkeleton
 * shell as the management surface is enough to avoid a flash on the redirect.
 * app/faculty/faculties/loading.tsx is intentionally left untouched.
 */
export default function FacultiesCoordinatorsLoading() {
  return (
    <section className="h-full flex flex-col">
      <div className="flex-1 min-h-0 pt-[16px] px-8 pb-[30px] flex flex-col">
        <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
          <CoordinatorTableSkeleton />
        </div>
      </div>
    </section>
  )
}
