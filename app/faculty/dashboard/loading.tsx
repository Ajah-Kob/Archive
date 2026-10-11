import { PageLabel } from '@/components/globals/PageLabel'

/**
 * Streaming fallback for /faculty/dashboard.
 *
 * Mirrors ChairDashboardPage: the welcome callout, the 2x2 stat-card block on
 * the left, and the calendar + alerts rail on the right. Empty fixed-width
 * blocks only — no text.
 */

const CARD =
  'bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)]'

function CardHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 px-[20px] pt-[16px] pb-[12px] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="size-[22px] rounded-[7px] bg-[#e8ebf8] shrink-0" />
        <div className="h-[14px] w-28 rounded bg-slate-200" />
      </div>
      <div className="h-[11px] w-12 rounded bg-[#e8ebf8] shrink-0" />
    </div>
  )
}

/** Stat grid card (Section Overview / Faculty Capacity / Defense / Phase). */
function StatCardSkeleton() {
  return (
    <div className={`${CARD} flex flex-col overflow-hidden`}>
      <CardHeaderSkeleton />
      <div className="grid grid-cols-3 gap-[10px] px-[20px] pb-[18px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-[4px] min-w-0">
            <div className="h-[26px] w-10 rounded bg-slate-200" />
            <div className="h-[11px] w-16 rounded bg-[#e8ebf8]" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Rail card (Calendar deadlines / Alerts) — labelled bar rows. */
function ListCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={`${CARD} flex flex-col overflow-hidden`}>
      <CardHeaderSkeleton />
      <div className="flex flex-col gap-[10px] px-[20px] pb-[18px]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-[11px] w-[74px] rounded bg-[#e8ebf8] shrink-0" />
            <div className="flex-1 h-[6px] rounded-[3px] bg-[#e8ebf8] min-w-0" />
            <div className="h-[11px] w-[38px] rounded bg-[#e8ebf8] shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ChairDashboardLoading() {
  return (
    <section className="min-h-full flex flex-col gap-[14px] pt-[30px] px-4 sm:px-[30px] pb-[30px] overflow-y-auto">
      <PageLabel label="Dashboard" />
      <div aria-hidden="true" className="flex flex-col gap-[10px] animate-pulse">
        {/* Welcome callout. */}
        <div className="flex items-center gap-[16px] rounded-[14px] border border-[rgba(112,125,255,0.2)] bg-[rgba(112,125,255,0.07)] px-[22px] py-[18px]">
          <div className="size-[40px] rounded-[12px] bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
            <div className="h-[15px] w-40 rounded bg-slate-200" />
            <div className="h-[13px] w-64 max-w-full rounded bg-[#e8ebf8]" />
          </div>
        </div>

        <div className="flex flex-col gap-[10px] lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-[10px]">
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-[10px]">
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[10px] lg:w-[36%] lg:max-w-[440px]">
            <ListCardSkeleton />
            <ListCardSkeleton rows={3} />
          </div>
        </div>
      </div>
    </section>
  )
}
