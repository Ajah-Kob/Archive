'use client'

const BLOCK = 'bg-[#e8ebf8]'
const SOFT = 'bg-[#e8ebf8]/70'

/**
 * Mobile skeleton for the templates list — one card per template, below `sm`.
 *
 * The mobile branch of TemplateTable previously rendered TableSkeleton, which is
 * the desktop five-column grid (1.9fr_0.9fr_1.4fr_0.6fr_80px, a 34px file icon and
 * a 160px title block). Inside the mobile `p-3` container that squeezed five
 * columns into a 375px viewport. This mirrors the real card in TemplateTable
 * one-for-one instead, so the swap to loaded content does not reshape the list.
 *
 * The card is one row now — icon, two stacked lines of text, and the row menu —
 * matching the icon and menu trigger measurements from FileIcon and ActionMenu.
 */
export default function CardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-[12px] mb-[10px] last:mb-0 rounded-[12px] border border-[#eceef8] bg-white px-[12px] py-[12px]"
        >
          <div className={`size-[34px] rounded-[8px] shrink-0 ${BLOCK}`} />

          {/* File name, then the size / uploader / date meta line. */}
          <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
            <div className={`h-[13px] w-[58%] rounded ${BLOCK}`} />
            <div className={`h-[12px] w-[86%] rounded ${SOFT}`} />
          </div>

          <div className={`size-[30px] rounded-[8px] shrink-0 ${BLOCK}`} />
        </div>
      ))}
    </div>
  )
}