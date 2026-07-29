'use client'

const GRID_COLS = 'grid-cols-[1fr_170px_170px_90px_80px]'

export default function TableSkeleton() {
  const rows = Array.from({ length: 5 })

  return (
    <>
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
        .templates-grid-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8aec8;
        }
        .templates-grid-scroll {
          overflow-y: auto;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: #c8cde0 #f0f2fa;
        }
        .header-grid-gutter {
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          -ms-overflow-style: none;
        }
        .header-grid-gutter::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 animate-pulse">
        {/* Header row */}
        <div className="overflow-hidden rounded-t-[14px] shrink-0 header-grid-gutter">
          <div className={`grid ${GRID_COLS} px-[20px] py-[15px] bg-[#f8f9fe] border-b border-[#eceef8] items-center`}>
            <div className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase">NAME</div>
            <div className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase">DATE UPLOADED</div>
            <div className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase">UPLOADED BY</div>
            <div className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase">SIZE</div>
            <div></div>
          </div>
        </div>

        {/* Skeleton rows */}
        <div className="overflow-x-auto flex-1 min-h-0 templates-grid-scroll">
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
      </div>
    </>
  )
}
