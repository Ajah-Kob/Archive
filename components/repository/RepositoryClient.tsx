'use client'

import { useState, useMemo } from 'react'
import { startOfDay, endOfDay } from 'date-fns'
import { useRouter } from 'next/navigation'
import {
  Star,
  Eye,
  ExternalLink,
  X,
  Plus,
  Loader2,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from 'lucide-react'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState } from '@/components/ui/EmptyState'
// Wired to the subtask 03 spec path (built in parallel — see report if the
// export shape differs when subtask 03 lands).
import UploadArchiveModal from '@/components/repository/UploadArchiveModal'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { DeleteArchiveModal } from '@/components/repository/DeleteArchiveModal'
import { EditArchiveModal } from '@/components/repository/EditArchiveModal'
import { formatAuthorsForRepository, formatRepositoryDate } from '@/lib/archiving/validation'
import { AppDateRangePicker } from '@/components/ui/AppDateRangePicker'
import { toSignedBlobPath } from '@/lib/blob'
import { useIsCoarsePointer } from '@/lib/hooks/useMediaQuery'
import { PdfViewer } from '@/components/archiving/PdfViewer'
import { toast } from 'sonner'
import {
  favoriteArchive,
  unfavoriteArchive,
  type RepositoryArchiveRow,
} from '@/lib/actions/repository'

interface RepositoryClientProps {
  archives: RepositoryArchiveRow[]
  isAdmin?: boolean
  /** Archive IDs the signed-in user has favorited. Empty when signed out. */
  favoriteIds: number[]
  /** False for signed-out visitors — the star is rendered disabled. */
  canFavorite: boolean
}

// Repository empty states use the shared component below.

function DetailsModal({ item, onClose }: { item: RepositoryArchiveRow | null; onClose: () => void }) {
  if (!item) return null
  const authors = Array.isArray(item.authorOrder) ? item.authorOrder : []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paper details"
        className="relative w-full max-w-[640px] max-h-[80vh] bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16)] border border-[#eceef8] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#f0f2fa] shrink-0">
          <h2 className="font-heading font-bold text-[15px] leading-[22px] text-[#10133a]">Paper Details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="size-[30px] rounded-[10px] bg-[#fafbff] border border-[#eceef8] flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <X className="size-[14px] text-[#8a93b4]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <div>
            <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-2">Research Title</p>
            <p className="font-sans font-bold text-[14px] leading-[20px] text-[#1e2145] break-words">{item.title}</p>
          </div>

          <div>
            <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-2">Abstract / Overview</p>
            <p className="font-sans text-[13px] leading-[20px] text-[#5a6382] whitespace-pre-wrap break-words">{item.abstract ?? 'No abstract provided.'}</p>
          </div>

          <div>
            <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-2">Authors</p>
            {authors.length === 0 ? (
              <p className="font-sans text-[12.5px] text-[#9ea8c6]">No authors</p>
            ) : (
              <div className="border border-[#e8ebf8] rounded-[10px] divide-y divide-[#f0f2fa] overflow-hidden bg-white">
                {authors.map((a, idx) => (
                  <div key={`${a.email}-${idx}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex items-center justify-center size-[22px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans font-semibold text-[12.5px] leading-[18px] text-[#1e2145] truncate">
                        {a.lastName ? `${a.lastName}, ${a.firstName ?? ''}`.trim() : a.firstName ?? '—'}
                      </p>
                      <p className="font-sans text-[11.5px] leading-[14px] text-[#8a93b4] truncate">{a.email ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#f0f2fa] px-6 py-4 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] text-[#5a6382] hover:bg-[#f8f9ff] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// In-app reader for a published capstone. Renders the headless EmbedPDF
// viewer — custom UI, no browser toolbar, no download button — instead of a
// new tab. The viewer fetches the signed route itself from `item.blobUrl`
// and revokes its object URL on unmount, so this modal holds no bytes.
function ReaderModal({ item, onClose }: { item: RepositoryArchiveRow | null; onClose: () => void }) {
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Read document: ${item.title}`}
        className="relative w-full max-w-[880px] h-[85vh] bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16)] border border-[#eceef8] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#f0f2fa] shrink-0">
          <h2 className="font-heading font-bold text-[15px] leading-[22px] text-[#10133a] truncate">{item.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reader"
            className="size-[30px] rounded-[10px] bg-[#fafbff] border border-[#eceef8] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
          >
            <X className="size-[14px] text-[#8a93b4]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <PdfViewer src={item.blobUrl} fileName={item.fileName} />
        </div>
      </div>
    </div>
  )
}

const PER_PAGE = 10

/**
 * Orderings offered by the sort control, in the order it lists them. Same set as
 * the templates list, so the two screens behave identically.
 *
 * `newest` is the default because it matches what the server already sends
 * (datePublished desc), which means the list is unchanged until someone picks
 * something else.
 */
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'az', label: 'A-Z' },
  { value: 'za', label: 'Z-A' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

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
function RepositoryPagination({
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

export function RepositoryClient({
  archives,
  isAdmin = false,
  favoriteIds,
  canFavorite,
}: RepositoryClientProps) {
  const router = useRouter()
  // EmbedPDF workspaces are desktop-only (touch gestures unresolved), so the
  // in-app reader is desktop-only too. Coarse pointers keep the previous
  // new-tab viewer rather than losing reading entirely on mobile.
  const isCoarsePointer = useIsCoarsePointer()
  const [searchTerm, setSearchTerm] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortValue, setSortValue] = useState<SortValue>('newest')
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [selected, setSelected] = useState<RepositoryArchiveRow | null>(null)
  const [readerTarget, setReaderTarget] = useState<RepositoryArchiveRow | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RepositoryArchiveRow | null>(null)
  const [editTarget, setEditTarget] = useState<RepositoryArchiveRow | null>(null)
  const [favoriteIdsState, setFavoriteIdsState] = useState<Set<number>>(
    () => new Set(favoriteIds),
  )
  // Re-sync when the server hands down a different set (e.g. after
  // router.refresh()). Adjusting during render is React's sanctioned pattern
  // for prop-derived state; a useEffect here would trip
  // react-hooks/set-state-in-effect and force an extra render pass.
  const [syncedFavoriteIds, setSyncedFavoriteIds] = useState(favoriteIds)
  if (syncedFavoriteIds !== favoriteIds) {
    setSyncedFavoriteIds(favoriteIds)
    setFavoriteIdsState(new Set(favoriteIds))
  }

  // Pending writes are tracked per archive, not globally. A single shared id
  // would disable the star on every card while one write was in flight, which
  // read as a broken list. Each card's own write is independent — same-item
  // double-clicks are still blocked, different items proceed concurrently.
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<number>>(
    () => new Set(),
  )

  const markPending = (id: number, pending: boolean) =>
    setPendingFavoriteIds((prev) => {
      const nextSet = new Set(prev)
      if (pending) nextSet.add(id)
      else nextSet.delete(id)
      return nextSet
    })

  const toggleFavorite = async (item: RepositoryArchiveRow) => {
    if (!canFavorite || pendingFavoriteIds.has(item.id)) return
    const wasFavorited = favoriteIdsState.has(item.id)
    const next = !wasFavorited

    // Optimistic: flip the star immediately so the tap feels instant, then
    // confirm with the server. The spinner communicates "saving" without
    // delaying that feedback.
    setFavoriteIdsState((prev) => {
      const nextSet = new Set(prev)
      if (next) nextSet.add(item.id)
      else nextSet.delete(item.id)
      return nextSet
    })
    markPending(item.id, true)

    const result = next ? await favoriteArchive(item.id) : await unfavoriteArchive(item.id)

    if (!result?.success) {
      // Roll back to whatever the server last confirmed.
      setFavoriteIdsState((prev) => {
        const rolled = new Set(prev)
        if (wasFavorited) rolled.add(item.id)
        else rolled.delete(item.id)
        return rolled
      })
      toast.error(result?.message || 'Could not update favorites.')
    }
    markPending(item.id, false)
  }

  // No client-side sort control: getArchivedCapstonesData() already returns
  // datePublished desc (see lib/actions/repository.ts), so the list arrives
  // newest-first and stays in that order as filters narrow it.
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    // A picked day arrives at midnight. Comparing datePublished <= `dateTo`
    // directly would therefore drop every archive published later that same
    // day, so the end bound is widened to 23:59:59.999 and the start bound
    // pulled back to 00:00:00.000. Same guard as lib/actions/audit.ts, applied
    // client-side because the repository filters in the browser.
    const fromMs = dateFrom ? startOfDay(dateFrom).getTime() : null
    const toMs = dateTo ? endOfDay(dateTo).getTime() : null

    const list = archives.filter((item) => {
      if (favoritesOnly && !favoriteIdsState.has(item.id)) return false
      if (fromMs !== null || toMs !== null) {
        const published = new Date(item.datePublished).getTime()
        if (fromMs !== null && published < fromMs) return false
        if (toMs !== null && published > toMs) return false
      }
      if (!term) return true
      const authorsFormatted = formatAuthorsForRepository(item.authorOrder).toLowerCase()
      const tagsJoined = item.tags.join(' ').toLowerCase()
      const title = item.title.toLowerCase()
      const abstract = (item.abstract ?? '').toLowerCase()
      return title.includes(term) || authorsFormatted.includes(term) || abstract.includes(term) || tagsJoined.includes(term)
    })

    // Sorting happens after filtering so the order is stable for the current page
    // and does not reshuffle as the search box narrows the list. Date bounds are
    // widened to whole days above, so a same-day pair compares equal and A-Z
    // falls through to the title as the tiebreak.
    const sorted = [...list]
    switch (sortValue) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())
        break
      case 'oldest':
        sorted.sort((a, b) => new Date(a.datePublished).getTime() - new Date(b.datePublished).getTime())
        break
      case 'az':
        sorted.sort((a, b) => a.title.localeCompare(b.title) || new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())
        break
      case 'za':
        sorted.sort((a, b) => b.title.localeCompare(a.title) || new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())
        break
    }

    return sorted
  }, [archives, searchTerm, favoritesOnly, favoriteIdsState, dateFrom, dateTo, sortValue])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  // The page is stored together with the filter signature it was set under.
  // Changing a filter therefore resets to page 1 by derivation — no effect, so
  // no double render — and going back to a previous filter restores the page
  // you were on.
  const filterKey = `${searchTerm}|${favoritesOnly}|${dateFrom?.getTime() ?? ''}|${dateTo?.getTime() ?? ''}`
  const [pageState, setPageState] = useState({ page: 1, filterKey: '' })
  const page = pageState.filterKey === filterKey ? pageState.page : 1
  const setPage = (next: number) => setPageState({ page: next, filterKey })

  // Narrowing the filters can strand the reader past the last page, so the
  // page is clamped rather than trusted.
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  // An inverted range matches nothing; the alert explains why the list is
  // empty instead of leaving a bare "No Results Found".
  const isDateRangeInvalid =
    dateFrom !== null && dateTo !== null && dateFrom.getTime() > dateTo.getTime()

  const clearDateRange = () => {
    setDateFrom(null)
    setDateTo(null)
  }

  // Desktop opens the in-app reader (headless EmbedPDF — no browser toolbar,
  // no download button). Coarse pointers keep the previous new-tab viewer:
  // EmbedPDF workspaces are desktop-only, and blocking reading on mobile
  // would be a regression, not a policy.
  //
  // Archive PDFs are private blobs, so the raw vercel-storage URL is not
  // openable in the browser — it 401s. The mobile path fetches through the
  // auth-gated signed route instead, then hands the tab an object URL. This
  // also lets a signed-out visitor (the /repository page itself is ungated)
  // get a readable toast rather than a raw 401 JSON page in a new tab.
  const openArchive = async (item: RepositoryArchiveRow) => {
    if (!isCoarsePointer) {
      setReaderTarget(item)
      return
    }
    // window.open MUST run synchronously inside the click handler. Browsers
    // only permit it while the page still holds live user activation, and an
    // `await` yields to the event loop — so opening the tab after the fetch
    // resolves is treated as unsolicited and blocked. That made the pop-up
    // fail intermittently, on a race between the fetch and the activation
    // window expiring (fast/cached fetch won, slow/large PDF lost).
    // Open the shell first, then navigate it once the bytes are in hand.
    const tab = window.open('', '_blank')
    if (!tab) {
      toast.error('Allow pop-ups to open this document.')
      return
    }
    tab.opener = null
    // Paint a placeholder so the tab is not blank while the PDF downloads.
    try {
      tab.document.write(
        '<!doctype html><meta charset="utf-8"><body style="font:14px/1.5 system-ui,-apple-system,sans-serif;color:#5a6382;padding:2.5rem">Loading document…</body>',
      )
      tab.document.close()
    } catch {
      // A tab that refuses document.write is still usable for navigation.
    }

    let objectUrl: string | null = null
    try {
      const signedPath = toSignedBlobPath(item.blobUrl)
      if (!signedPath) {
        tab.close()
        toast.error('This document has no stored file.')
        return
      }

      const res = await fetch(signedPath, { credentials: 'include' })
      if (res.status === 401) {
        tab.close()
        toast.error('Sign in to open this document.')
        return
      }
      if (!res.ok) {
        tab.close()
        toast.error('Could not open this document.')
        return
      }

      const blob = await res.blob()
      objectUrl = URL.createObjectURL(blob)
      tab.location.replace(objectUrl)
      // Give the new tab time to load before releasing the blob.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl as string), 60_000)
    } catch {
      tab.close()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      toast.error('Could not open this document.')
    }
  }

  return (
    <>
      <HeaderBar
        actions={
          isAdmin ? (
            // Hidden below sm — the floating button carries the action there.
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="hidden sm:flex items-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] text-white rounded-lg font-sans font-semibold text-[13px] shadow-[0px_2px_5px_rgba(112,125,255,0.25)] hover:bg-[#5565ff] active:scale-[0.98] transition-all shrink-0"
            >
              <Plus className="size-4" strokeWidth={2} />
              <span className="whitespace-nowrap">Upload Research</span>
            </button>
          ) : undefined
        }
      >
        {/* Single line: search, date range, clear and favourites scroll together
            inside HeaderBar's strip rather than wrapping onto a second row. */}
        <div className="flex items-center gap-2.5 shrink-0">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by title, keyword, author, or section..."
            ariaLabel="Search repository"
            className="w-[280px] sm:flex-[0_0_320px] sm:max-w-[320px] shrink-0"
            clearable
          />

          {/* Published-date range. Shares the children row (rather than the
              actions slot) so the admin Upload Research CTA keeps the
              top-right. Capped rather than w-full because the bar is a single
              line -- a full-width action would collapse the tab strip. */}
          <div
            className="w-[280px] sm:w-[300px] shrink-0"
            role="group"
            aria-label="Filter by published date range"
          >
            <AppDateRangePicker
              start={dateFrom}
              end={dateTo}
              onStartChange={setDateFrom}
              onEndChange={setDateTo}
            />
          </div>

          {dateFrom !== null || dateTo !== null ? (
            <button
              type="button"
              onClick={clearDateRange}
              className="inline-flex items-center gap-1 h-[34px] px-2.5 rounded-lg bg-white border border-[#dfe3fb] font-sans font-semibold text-[12px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors shrink-0"
            >
              <X className="size-[12px]" strokeWidth={2} aria-hidden="true" />
              Clear dates
            </button>
          ) : null}

          {isDateRangeInvalid ? (
            <span
              role="alert"
              className="font-sans text-[11.5px] leading-none text-[#b4530a] shrink-0"
            >
              Start date is after end date
            </span>
          ) : null}
        </div>
      </HeaderBar>

      <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-8 bg-[#f8f9fe] bg-[radial-gradient(circle,#dbe0f3_1px,transparent_1px)] bg-[size:22px_22px] gap-4 overflow-y-auto">
        {/* One row above the list: Sort, the results count, then Favorites.
            ml-auto keeps Favorites hard right; flex-wrap lets the row reflow on
            narrow screens instead of overflowing, since this is one line at
            every width rather than a mobile-only control. */}
<div className="flex flex-wrap items-center gap-x-[10px] gap-y-[8px] shrink-0">
          <div className="relative shrink-0">
            <select
              id="repository-sort"
              aria-label="Sort results"
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value as SortValue)}
              className="appearance-none h-[37.5px] pl-[13px] pr-[36px] bg-white border border-[#e8ebf8] rounded-lg font-sans font-semibold text-[13px] text-[#5a6382] cursor-pointer focus:outline-none focus:border-[rgba(112,125,255,0.6)] hover:border-[rgba(112,125,255,0.6)] transition-colors"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 size-4 text-[#8a93b4]"
            />
          </div>

          <div className="flex items-center min-w-0 text-[11px] font-bold tracking-[0.88px] uppercase text-[#9ea8c6]">
            <span className="whitespace-nowrap">{filtered.length} RESULTS</span>
          </div>

          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            disabled={!canFavorite}
            aria-pressed={favoritesOnly}
            title={canFavorite ? undefined : 'Sign in to save favorites'}
            className={`ml-auto inline-flex items-center gap-1.5 h-[37.5px] px-3 rounded-lg border text-[12.5px] font-sans font-semibold transition-colors shrink-0 disabled:opacity-45 disabled:cursor-not-allowed ${
              favoritesOnly
                ? 'bg-[#fff8e6] border-[#f0d189] text-[#a5730a]'
                : 'bg-white border-[#dfe3fb] text-[#5a6382] hover:bg-[#f8f9ff]'
            }`}
          >
            <Star
              className={`size-[13px] ${favoritesOnly ? 'fill-current' : ''}`}
              strokeWidth={2}
              aria-hidden="true"
            />
            Favorites
            <span className="tabular-nums opacity-70">({favoriteIdsState.size})</span>
          </button>
        </div>

        {archives.length === 0 ? (
          <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.04)]">
            <EmptyState
              heading="No Archived Capstones Yet"
              description="Approved capstones will appear here once the Program Chair publishes them. Check back soon or refine your search."
              variant="card"
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.04)]">
            {favoritesOnly && favoriteIdsState.size === 0 ? (
              <EmptyState
                heading="No favorites yet"
                description="Star a capstone you're interested in and it will show up here."
                variant="card"
              />
            ) : (
              <EmptyState
                heading="No Results Found"
                description="We couldn't find anything matching your search. Try a different keyword or clear your filters."
                variant="card"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {paged.map((item) => {
              const authorsLine = formatAuthorsForRepository(item.authorOrder)
              const dateLabel = formatRepositoryDate(item.datePublished)
              const tags = Array.isArray(item.tags) ? item.tags.filter((t) => t.trim().length > 0) : []
              const isFavoritePending = pendingFavoriteIds.has(item.id)
              return (
                <div
                  key={item.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open document: ${item.title}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, a')) return
                    void openArchive(item)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    if ((e.target as HTMLElement).closest('button, a')) return
                    e.preventDefault()
                    void openArchive(item)
                  }}
                  className="bg-white rounded-[12px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_28px_rgba(112,125,255,0.16)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex overflow-hidden w-full"
                >
                  <div className="w-[5px] bg-[#707dff] shrink-0 self-stretch rounded-l-[12px]" aria-hidden="true" />
                  <div className="flex-1 min-w-0 p-[20px] flex flex-col gap-[12px]">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="flex-1 min-w-0 font-heading font-bold text-[15px] leading-[21.75px] tracking-[-0.15px] text-[#10133a] break-words line-clamp-3">
                        {item.title}
                      </h2>
                      {isAdmin ? (
                        <div className="shrink-0 -mr-1 -mt-1">
                          <ActionMenu
                            items={[
                              {
                                label: 'Edit',
                                onClick: () => setEditTarget(item),
                              },
                              {
                                label: 'Delete',
                                variant: 'danger',
                                onClick: () => setDeleteTarget(item),
                              },
                            ]}
                          />
                        </div>
                      ) : null}
                    </div>

                    <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] break-words">
                      Published {dateLabel}
                      {authorsLine ? ` · ${authorsLine}` : ''}
                    </p>

                    <p className="font-sans font-normal text-[12.5px] leading-[20.625px] text-[#8a93b4] break-words whitespace-pre-wrap line-clamp-4">
                      {item.abstract ?? 'No abstract provided.'}
                    </p>

                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-[5px] w-full">
                        {tags.map((tag, idx) => (
                          <span
                            key={`${tag}-${idx}`}
                            className="inline-flex items-center h-[23px] px-[9px] py-[2px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-sans text-[11px] leading-[16px] text-[#bbc0d8]">No tags</p>
                    )}

                    <div className="border-t border-[#f0f2fa] pt-[12px] mt-[4px] flex flex-wrap justify-end gap-[10px]">
                      <button
                        type="button"
                        onClick={() => void toggleFavorite(item)}
                        disabled={!canFavorite || isFavoritePending}
                        aria-pressed={favoriteIdsState.has(item.id)}
                        aria-busy={isFavoritePending}
                        aria-label={
                          favoriteIdsState.has(item.id)
                            ? `Remove ${item.title} from favorites`
                            : `Add ${item.title} to favorites`
                        }
                        title={canFavorite ? undefined : 'Sign in to save favorites'}
                        className={`inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[9px] border font-sans font-bold text-[12.5px] leading-none transition-colors disabled:cursor-not-allowed ${
                          isFavoritePending
                            ? 'opacity-70'
                            : favoriteIdsState.has(item.id)
                              ? 'bg-[#fff8e6] border-[#f0d189] text-[#a5730a] hover:bg-[#fff8e6]'
                              : 'bg-white border-[#dfe3fb] text-[#5a6382] hover:bg-[#f8f9ff]'
                        }`}
                      >
                        {/* Spinner occupies the star's exact 12px box, so the
                            button never changes width between states. The
                            label still tracks the optimistic value, so the
                            star fills instantly while this confirms it. */}
                        {isFavoritePending ? (
                          <Loader2
                            className="size-[12px] animate-spin motion-reduce:animate-none"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        ) : (
                          <Star
                            className={`size-[12px] ${favoriteIdsState.has(item.id) ? 'fill-current' : ''}`}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                        {favoriteIdsState.has(item.id) ? 'Saved' : 'Favorite'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        aria-label="View details"
                        className="inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-bold text-[12.5px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors"
                      >
                        <Eye className="size-[12px] text-[#5a6382]" strokeWidth={2} />
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void openArchive(item)}
                        aria-label="Open document"
                        className="inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-bold text-[12.5px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors"
                      >
                        <ExternalLink className="size-[12px] text-[#5a6382]" strokeWidth={2} />
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <RepositoryPagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>

      <DetailsModal item={selected} onClose={() => setSelected(null)} />

      <ReaderModal item={readerTarget} onClose={() => setReaderTarget(null)} />

      <DeleteArchiveModal archive={deleteTarget} onClose={() => setDeleteTarget(null)} />

      {isAdmin ? (
        <EditArchiveModal
          archive={editTarget}
          onClose={() => setEditTarget(null)}
          onEditComplete={() => {
            setEditTarget(null)
            router.refresh()
          }}
        />
      ) : null}

      {isAdmin ? (
        <UploadArchiveModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={() => {
            setIsUploadOpen(false)
            router.refresh()
          }}
        />
        ) : null}

        {/* Mobile stand-in for the Upload Research button in the bar. Same gate. */}
        {isAdmin ? (
          <FloatingActionButton
            icon={<Upload className="size-6" strokeWidth={2} />}
            label="Upload Research"
            onClick={() => setIsUploadOpen(true)}
          />
        ) : null}
      </>
    )
}

export default RepositoryClient
