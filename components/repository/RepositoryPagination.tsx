'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

/** How many numbered buttons to show at once, centred on the current page. */
const PAGE_WINDOW = 5

/**
 * `<<  <  1 2 3 4 5  >  >>`
 *
 * Scoped to the repository for now. The audit log has its own, different
 * control (a "Page [n] / total" field with prev/next only) — if this numbered
 * style is wanted everywhere, both should be folded into one shared component
 * rather than left as two.
 */
export function RepositoryPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const half = Math.floor(PAGE_WINDOW / 2)
  const end = Math.min(totalPages, page + half)
  // Keep the window full width once either end is in view.
  const start = Math.max(1, end - PAGE_WINDOW + 1)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const btn =
    'inline-flex items-center justify-center size-[32px] rounded-[9px] bg-white border border-[#e8ebf8] text-[#5a6382] hover:bg-[#fafbff] hover:border-[#dfe3fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0'
  const numBtn = `${btn} text-[13px] font-semibold`
  const activeBtn =
    'inline-flex items-center justify-center size-[32px] rounded-[9px] bg-[#707dff] border border-[#707dff] text-white text-[13px] font-semibold shrink-0'

  return (
    <nav
      aria-label="Repository pages"
      className="flex items-center justify-center gap-[6px] pt-[4px] overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={page <= 1}
        aria-label="First page"
        className={btn}
      >
        <ChevronsLeft className="size-[14px]" />
      </button>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={btn}
      >
        <ChevronLeft className="size-[14px]" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          className={p === page ? activeBtn : numBtn}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={btn}
      >
        <ChevronRight className="size-[14px]" />
      </button>
      <button
        type="button"
        onClick={() => onChange(totalPages)}
        disabled={page >= totalPages}
        aria-label="Last page"
        className={btn}
      >
        <ChevronsRight className="size-[14px]" />
      </button>
    </nav>
  )
}
