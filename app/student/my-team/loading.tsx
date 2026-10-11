import { PageLabel } from '@/components/globals/PageLabel'

function MemberRowSkeleton() {
  return (
    <div className="grid items-center gap-3 py-[10px] grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[1fr_auto_auto_auto]">
      <div className="flex gap-2.5 items-center min-w-0">
        <div className="size-10 rounded-full bg-slate-200 shrink-0" />
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="h-[13px] w-32 rounded bg-slate-200" />
          <div className="h-[11px] w-44 rounded bg-[#e8ebf8]" />
        </div>
      </div>
      <div className="size-[14px] rounded-full bg-[#e8ebf8] hidden sm:block" />
      <div className="h-[20px] w-[72px] rounded-full bg-[#e8ebf8] hidden sm:block" />
      <div className="size-[30px] rounded-[8px] bg-white border border-[#eceef8] shrink-0" />
    </div>
  )
}

export default function MyTeamLoading() {
  return (
    <section className="h-full flex min-h-0">
      <PageLabel label="My Team" />
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 px-4 sm:px-8 py-[30px] flex flex-col">
          <div className="h-full flex flex-col gap-[16px] overflow-y-auto pr-[2px] pb-[4px] animate-pulse">
            {/* Group name card */}
            <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="h-[20px] w-48 rounded bg-slate-200" />
                  <div className="h-[12px] w-32 rounded bg-[#e8ebf8]" />
                </div>
                <div className="size-[30px] rounded-[8px] bg-white border border-[#eceef8] shrink-0" />
              </div>
            </div>

            {/* Topic card */}
            <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="h-[11px] w-[52px] rounded bg-[#e8ebf8]" />
                <div className="size-[30px] rounded-[8px] bg-white border border-[#eceef8] shrink-0" />
              </div>
              <div className="pt-[6px] flex flex-col gap-2">
                <div className="h-[14px] w-[70%] rounded bg-slate-200" />
                <div className="h-[14px] w-[45%] rounded bg-slate-200" />
              </div>
            </div>

            {/* Members + Adviser card */}
            <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] shrink-0">
              <div className="flex items-center justify-between">
                <div className="h-[11px] w-[64px] rounded bg-[#e8ebf8]" />
              </div>
              <div className="pt-[6px] flex flex-col">
                <MemberRowSkeleton />
                <MemberRowSkeleton />
                <MemberRowSkeleton />
              </div>
              <div className="mt-[12px] h-[38px] w-full rounded-[10px] border border-dashed border-[#d4d8f0]" />
              <div aria-hidden="true" className="h-[20px]" />
              <div className="h-[11px] w-[58px] rounded bg-[#e8ebf8]" />
              <div className="pt-[6px] flex gap-2.5 items-center">
                <div className="size-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="h-[13px] w-32 rounded bg-slate-200" />
                  <div className="h-[11px] w-44 rounded bg-[#e8ebf8]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
