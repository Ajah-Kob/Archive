import { MembersTableSkeleton } from '@/components/faculty/MembersTableSkeleton'

/**
 * Streaming fallback for the legacy faculties/members route.
 *
 * The page redirects to /faculty/faculty-management/members immediately, so
 * this never paints — the same white panel + MembersTableSkeleton shell as
 * the management surface is enough to avoid a flash on the redirect.
 */
export default function FacultiesMembersLoading() {
  return (
    <section className="h-full flex flex-col">
      <div className="flex-1 min-h-0 pt-[16px] px-8 pb-[30px] flex flex-col">
        <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
          <MembersTableSkeleton />
        </div>
      </div>
    </section>
  )
}
