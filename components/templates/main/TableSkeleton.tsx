'use client'

export default function TableSkeleton() {
  const rows = Array.from({ length: 5 })

  return (
    <>
      <style>{`
        .templates-table-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .templates-table-scroll::-webkit-scrollbar-track {
          background: #f0f2fa;
          border-radius: 999px;
        }
        .templates-table-scroll::-webkit-scrollbar-thumb {
          background: #c8cde0;
          border-radius: 999px;
        }
        .templates-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8aec8;
        }
        .templates-table-scroll {
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: #c8cde0 #f0f2fa;
        }
        .header-scrollbar-hidden {
          overflow-y: auto;
          scrollbar-gutter: stable;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .header-scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 animate-pulse">
        {/* Header */}
        <div className="flex-shrink-0 header-scrollbar-hidden overflow-hidden rounded-t-[14px]">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-[#f8f9fe] border-b border-[#eceef8]">
                <th className="py-[15px] px-[20px] text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase text-left w-auto">
                  NAME
                </th>
                <th className="py-[15px] px-[20px] text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase text-left w-[148px]">
                  DATE UPLOADED
                </th>
                <th className="py-[15px] px-[20px] text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase text-left w-[170px]">
                  UPLOADED BY
                </th>
                <th className="py-[15px] px-[20px] text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase text-left w-[90px]">
                  SIZE
                </th>
                <th className="w-[80px]"></th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Skeleton rows */}
        <div className="overflow-x-auto overflow-y-auto min-h-0 flex-1 templates-table-scroll">
          <table className="w-full table-fixed border-collapse">
            <tbody>
              {rows.map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-[#f0f2fa]"
                >
                  <td className="px-[20px] h-[63px]">
                    <div className="flex items-center gap-[12px]">
                      <div className="size-[24px] rounded-[8px] bg-[#e8ebf8]" />
                      <div className="h-[13px] w-[160px] rounded bg-[#e8ebf8]" />
                    </div>
                  </td>
                  <td className="px-[20px] h-[63px] w-[148px]">
                    <div className="h-[12px] w-[100px] rounded bg-[#e8ebf8]" />
                  </td>
                  <td className="px-[20px] h-[63px] w-[170px]">
                    <div className="flex items-center gap-[8px]">
                      <div className="size-[24px] rounded-[12px] bg-[#e8ebf8]" />
                      <div className="h-[12px] w-[80px] rounded bg-[#e8ebf8]" />
                    </div>
                  </td>
                  <td className="px-[20px] h-[63px] w-[90px]">
                    <div className="h-[12px] w-[50px] rounded bg-[#e8ebf8]" />
                  </td>
                  <td className="px-[20px] h-[63px] text-right w-[80px]">
                    <div className="inline-flex gap-[3px]">
                      <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
                      <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
                      <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
