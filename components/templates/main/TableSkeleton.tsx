'use client'

const GRID_COLS = 'grid-cols-[1fr_170px_170px_90px_80px]'

/**
 * Bare skeleton rows for the templates table. Renders NO card of its own —
 * it nests inside TemplateTable's card so the toolbar/search strip stays
 * visible while data loads (same behavior as the faculty list).
 */
export default function TableSkeleton() {
  const rows = Array.from({ length: 5 })

  return (
    <div className="overflow-x-auto flex-1 min-h-0 templates-grid-scroll animate-pulse">
      {rows.map((_, i) => (
        <div
          key={i}
          className={`grid ${GRID_COLS} px-[20px] h-[63px] items-center border-b border-[#f0f2fa]`}
        >
          <div className="flex items-center gap-[12px]">
            <div className="size-[24px] rounded-[8px] bg-[#e8ebf8]" />
            <div className="h-[13px] w-[160px] rounded bg-[#e8ebf8]" />
          </div>
          <div className="h-[12px] w-[100px] rounded bg-[#e8ebf8]" />
          <div className="flex items-center gap-[8px]">
            <div className="size-[24px] rounded-[12px] bg-[#e8ebf8]" />
            <div className="h-[12px] w-[80px] rounded bg-[#e8ebf8]" />
          </div>
          <div className="h-[12px] w-[50px] rounded bg-[#e8ebf8]" />
          <div className="flex justify-end gap-[3px]">
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
          </div>
        </div>
      ))}
    </div>
  )
}
