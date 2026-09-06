'use client'

const GRID_COLS = 'grid-cols-[1.9fr_0.9fr_1.4fr_0.6fr_80px]'

/**
 * Bare skeleton rows for the templates table. Renders NO card of its own —
 * it nests inside TemplateTable's min-w wrapper so the header stays visible
 * while data loads. Columns match TemplateTable GRID_COLS (name widest).
 */
export default function TableSkeleton() {
  const rows = Array.from({ length: 5 })

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-pulse">
      {rows.map((_, i) => (
        <div
          key={i}
          className={`grid ${GRID_COLS} px-[20px] h-[60px] items-center border-b border-[#f0f2fa] last:border-b-0`}
        >
          <div className="flex items-center gap-[12px] min-w-0 pr-4">
            <div className="size-[34px] rounded-[8px] bg-[#e8ebf8] shrink-0" />
            <div className="h-[13px] w-[160px] rounded bg-[#e8ebf8]" />
          </div>
          <div className="h-[12px] w-[90px] rounded bg-[#e8ebf8]" />
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="size-8 rounded-full bg-[#e8ebf8] shrink-0" />
            <div className="flex flex-col gap-1.5">
              <div className="h-[12px] w-[90px] rounded bg-[#e8ebf8]" />
              <div className="h-[10px] w-[120px] rounded bg-[#e8ebf8]/70" />
            </div>
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
