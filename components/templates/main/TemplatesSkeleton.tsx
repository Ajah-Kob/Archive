import { HeaderBar } from '@/components/globals/HeaderBar'
import CardSkeleton from './CardSkeleton'
import TableSkeleton from './TableSkeleton'

const GRID_COLS = 'grid-cols-[1.9fr_0.9fr_1.4fr_0.6fr_80px]'
const BLOCK = 'bg-[#e8ebf8]'

export interface TemplatesSkeletonProps {
  /** Admin and faculty may upload; students are read-only. */
  canUpload?: boolean
}

/**
 * Streaming fallback for the templates routes.
 *
 * Mirrors TemplatesPage + TemplateTable one-for-one so the swap to loaded
 * content does not reshape the page: the same single-line bar (search, My
 * Uploads toggle, Upload Template) and the same card shell, which shows one
 * card per template below `sm` and the five-column grid above it.
 *
 * The two halves are not interchangeable. An earlier version of the templates
 * loading state rendered the desktop grid inside the mobile container, squeezing
 * five columns into 375px, so CardSkeleton exists as its mobile counterpart.
 */
export function TemplatesSkeleton({ canUpload = true }: TemplatesSkeletonProps) {
  return (
    <>
      {/* TemplateTable injects this scrollbar styling itself, so it is absent
          while this fallback is on screen. Repeated here rather than hoisted to
          global CSS to leave the working component untouched; worth moving if a
          third consumer ever needs it. */}
      <style>{`
        .templates-grid-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .templates-grid-scroll::-webkit-scrollbar-track {
          background: #f0f2fa;
          border-radius: 999px;
        }
        .templates-grid-scroll::-webkit-scrollbar-thumb {
          background: #c8cde0;
          border-radius: 999px;
        }
        .templates-grid-scroll {
          overflow-y: auto;
          overflow-x: auto;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: #c8cde0 #f0f2fa;
        }
      `}</style>

      <div
        aria-hidden="true"
        className="flex flex-col flex-1 min-h-0 animate-pulse"
      >
        <HeaderBar
          actions={
            // Hidden below sm — the floating button carries the action there.
            canUpload ? (
              <div className="hidden sm:flex items-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] rounded-lg shrink-0">
                <div className="size-4 rounded-[4px] bg-white/70" />
                <div className="h-[11px] w-[104px] rounded bg-white/70" />
              </div>
            ) : undefined
          }
        >
          {/* Search + My Uploads scroll together inside HeaderBar's strip. */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-[280px] shrink-0 sm:py-[8px]">
              <div className="w-full h-[37.5px] bg-white border border-[#e8ebf8] rounded-lg" />
            </div>
            {canUpload ? (
              <div className="flex items-center gap-2 h-[37.5px] px-[13px] bg-white border border-[#e8ebf8] rounded-lg shrink-0">
                <div className={`h-[11px] w-[66px] rounded ${BLOCK}`} />
                <div className={`relative w-[32px] h-[18px] rounded-full shrink-0 ${BLOCK}`} />
              </div>
            ) : null}
          </div>
        </HeaderBar>

        <div className="flex-1 min-h-0 pt-[16px] px-4 pb-[30px] sm:px-8 flex flex-col">
          <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Mobile: one card per template. */}
            <div className="sm:hidden flex-1 min-h-0 overflow-y-auto p-3">
              <CardSkeleton />
            </div>

            {/* Desktop: the five-column grid, header row above the body rows. */}
            <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-x-auto templates-grid-scroll">
              <div className="min-w-[720px] flex flex-col min-h-full">
                <div className="bg-[#fafbff] shrink-0 border-b border-[#f0f2fa] rounded-t-[14px]">
                  <div className={`grid ${GRID_COLS} px-[20px] h-[39px] items-center`}>
                    <div className={`h-[10px] w-[42px] rounded ${BLOCK}`} />
                    <div className={`h-[10px] w-[88px] rounded ${BLOCK}`} />
                    <div className={`h-[10px] w-[78px] rounded ${BLOCK}`} />
                    <div className={`h-[10px] w-[30px] rounded ${BLOCK}`} />
                    <div />
                  </div>
                </div>

                <TableSkeleton />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile stand-in for the Upload Template button in the bar. */}
        {canUpload ? (
          <div className="sm:hidden fixed right-4 z-40 size-14 rounded-full bg-[#707dff]" />
        ) : null}
      </div>
    </>
  )
}