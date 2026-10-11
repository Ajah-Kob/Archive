import { PageLabel } from '@/components/globals/PageLabel'
import { ScrollFadeRegion } from '@/components/ui/ScrollFadeRegion'

/**
 * Streaming fallback for /faculty/document-review.
 *
 * Mirrors EvaluationTeamsView: the same single-line filter strip (search +
 * team/chapter/status filters) and the same six-column submission grid
 * (Team / Chapter / Submitted by / Date / Status / Action) with mobile cards
 * below sm. Empty fixed-width blocks only — no text.
 */

const GRID_COLS = 'grid-cols-[2fr_0.8fr_0.6fr_0.6fr_0.7fr_0.7fr]'
const BAR = 'bg-[#dfe3fb]'

export default function DocumentReviewLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Document Review" />
      <div aria-hidden="true" className="flex flex-col flex-1 min-h-0 animate-pulse">
        <div className="w-full flex flex-nowrap items-center gap-2.5 px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
          <ScrollFadeRegion className="flex items-center gap-2.5 flex-1">
            <div className={`h-[37.5px] w-[280px] sm:w-[320px] shrink-0 rounded-lg ${BAR}`} />
            <div className={`h-[37.5px] w-[140px] shrink-0 rounded-lg ${BAR}`} />
            <div className={`h-[37.5px] w-[140px] shrink-0 rounded-lg ${BAR}`} />
            <div className={`h-[37.5px] w-[140px] shrink-0 rounded-lg ${BAR}`} />
          </ScrollFadeRegion>
        </div>

        <div className="flex-1 min-h-0 pt-[16px] px-4 pb-[30px] sm:px-8 flex flex-col">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Mobile cards — the real view renders cards below sm. */}
              <div className="sm:hidden p-3 flex flex-col gap-[10px]">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-[10px] rounded-[12px] border border-[#eceef8] bg-white px-[12px] py-[12px]"
                  >
                    <div className="flex flex-col gap-[5px]">
                      <div className="h-[13px] w-[45%] rounded bg-slate-200" />
                      <div className="h-[11px] w-[70%] rounded bg-[#e8ebf8]" />
                    </div>
                    <div className="h-[12px] w-[38%] rounded bg-[#e8ebf8]" />
                    <div className="flex items-center justify-between gap-[10px]">
                      <div className="h-[20px] w-[80px] rounded-[7px] bg-[#e8ebf8]" />
                      <div className="h-[28px] w-[130px] rounded-[7px] bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: the original six-column grid. */}
              <div className="hidden sm:block">
                <div className={`grid ${GRID_COLS} items-center px-[20px] h-[40px] border-b border-[#f0f2fa] bg-[#fafbff]`}>
                  <div className="h-[10px] w-[42px] rounded bg-[#e8ebf8]" />
                  <div className="h-[10px] w-[56px] rounded bg-[#e8ebf8]" />
                  <div className="h-[10px] w-[74px] rounded bg-[#e8ebf8]" />
                  <div className="h-[10px] w-[32px] rounded bg-[#e8ebf8]" />
                  <div className="h-[10px] w-[44px] rounded bg-[#e8ebf8]" />
                  <div />
                </div>

                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-full grid ${GRID_COLS} items-center px-[20px] h-[58px] border-b border-[#f0f2fa] last:border-b-0`}
                  >
                    <div className="min-w-0 pr-4 flex flex-col gap-[6px]">
                      <div className="h-[13px] w-[70%] rounded bg-slate-200" />
                      <div className="flex items-center gap-[7px]">
                        <div className="h-[16px] w-[36px] rounded-[6px] bg-[#e8ebf8] shrink-0" />
                        <div className="h-[11px] w-[60%] rounded bg-[#e8ebf8]" />
                      </div>
                    </div>
                    <div className="min-w-0 pr-4 flex flex-col gap-[6px]">
                      <div className="h-[12px] w-[70%] rounded bg-slate-200" />
                      <div className="h-[11px] w-[50%] rounded bg-[#e8ebf8]" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <div className="h-[12px] w-[80%] rounded bg-slate-200" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <div className="h-[12px] w-[70%] rounded bg-[#e8ebf8]" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <div className="h-[20px] w-[80px] rounded-[7px] bg-[#e8ebf8]" />
                    </div>
                    <div className="flex items-center justify-end">
                      <div className="h-[28px] w-[130px] rounded-[7px] bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
