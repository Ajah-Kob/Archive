import { PageLabel } from '@/components/globals/PageLabel'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { AuditTable } from '@/components/admin/audit/AuditTable'

/**
 * Streaming fallback for /admin/audit.
 *
 * Mirrors AuditClient chrome: the HeaderBar strip (actor search + date-range
 * pair), the count line, AuditTable's own loading state, and the pinned
 * pagination footer bar. Empty fixed-width blocks only, no text — the column
 * headers come from the reused AuditTable skeleton itself.
 */
export default function AdminAuditLoading() {
  return (
    <section className="flex flex-col w-full h-full min-h-0 overflow-hidden">
      <PageLabel label="Audit Log" />

      <div
        aria-hidden="true"
        className="flex flex-col flex-1 min-h-0 overflow-hidden animate-pulse motion-reduce:animate-none"
      >
        <HeaderBar>
          <div className="flex flex-nowrap items-center gap-2.5 w-max">
            <div className="h-[37.5px] w-[240px] sm:w-[280px] shrink-0 rounded-lg bg-[#dfe3fb]" />
            <div className="w-[280px] sm:w-[320px] shrink-0 grid grid-cols-2 gap-[12px]">
              <div className="h-[37.5px] rounded-lg bg-white border border-[#e4e7f6]" />
              <div className="h-[37.5px] rounded-lg bg-white border border-[#e4e7f6]" />
            </div>
          </div>
        </HeaderBar>

        <div className="flex-1 min-h-0 flex flex-col px-8 pt-[16px] pb-[24px] gap-3 overflow-hidden">
          {/* Count line */}
          <div className="flex items-center justify-between px-1 shrink-0">
            <div className="h-[13px] w-[180px] rounded bg-[#e8ebf8]" />
            <div className="hidden sm:block h-[12px] w-[160px] rounded bg-[#e8ebf8]" />
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <AuditTable logs={[]} loading onSelect={() => {}} />
          </div>

          {/* Footer pinned shrink-0 — same shell as the audit page */}
          <div className="shrink-0 flex-none flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="h-[32px] w-[110px] rounded-[9px] bg-[#e8ebf8]" />
              <div className="hidden md:block h-[12px] w-[70px] rounded bg-[#e8ebf8]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-[32px] w-[64px] rounded-[9px] bg-white border border-[#e8ebf8]" />
              <div className="size-[32px] rounded-[9px] bg-white border border-[#e8ebf8]" />
              <div className="size-[32px] rounded-[9px] bg-white border border-[#e8ebf8]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
