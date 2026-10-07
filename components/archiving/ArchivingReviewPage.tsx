'use client'

import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import type { ArchivingReviewItem } from '@/lib/actions/archiving'
import { ChairReviewTable } from './ChairReviewTable'
import { ChairReviewDetailModal } from './ChairReviewDetailModal'

interface ArchivingReviewPageProps {
  submissions: ArchivingReviewItem[]
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'ARCHIVED', label: 'Archived' },
]

/** Same four orderings the templates and repository lists offer. */
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'az', label: 'A-Z' },
  { value: 'za', label: 'Z-A' },
] as const

/**
 * Client orchestrator for /faculty/archiving.
 * Owns HeaderBar search/filter state and wires table + detail modal together.
 * Mirrors DefenseSchedulingPage pattern: HeaderBar with SearchBar + Filter,
 * table card below with defense-style header/rows, empty states for filtered vs total.
 */
export function ArchivingReviewPage({ submissions }: ArchivingReviewPageProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<ArchivingReviewItem | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortValue, setSortValue] =
    useState<(typeof SORT_OPTIONS)[number]['value']>('newest')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return submissions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (!term) return true
      const authors = (s.authorOrder ?? []).map((a) => `${a.firstName} ${a.lastName} ${a.email}`).join(' ').toLowerCase()
      return (
        s.groupName.toLowerCase().includes(term) ||
        (s.sectionName ?? '').toLowerCase().includes(term) ||
        s.title.toLowerCase().includes(term) ||
        authors.includes(term)
      )
    })
  }, [submissions, search, statusFilter])

  // Group name is the primary identity a reviewer scans for, so A-Z uses it
  // rather than the research title. Newest/oldest order by submission time.
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      switch (sortValue) {
        case 'oldest':
          return a.submittedAt.localeCompare(b.submittedAt)
        case 'az':
          return a.groupName.localeCompare(b.groupName)
        case 'za':
          return b.groupName.localeCompare(a.groupName)
        default:
          return b.submittedAt.localeCompare(a.submittedAt)
      }
    })
    return list
  }, [filtered, sortValue])

  const hasAny = submissions.length > 0

  function handleView(item: ArchivingReviewItem) {
    setSelected(item)
  }

  function handleApproveFromTable(item: ArchivingReviewItem) {
    setSelected(item)
  }

  function handleClose() {
    setSelected(null)
  }

  function handleApproved() {
    setSelected(null)
    router.refresh()
  }

  return (
    <>
      <HeaderBar>
        <div className="flex flex-nowrap items-center gap-2.5 w-max">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search group, section, title, authors…"
            ariaLabel="Search archiving submissions"
            // Capped rather than w-full: this bar scrolls horizontally, and a
            // flexible search either collapses the filter beside it or fights the
            // w-max wrapper. Matches the search on the other bars.
            className="w-[280px] shrink-0 sm:w-[320px]"
          />
          <Filter
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
            ariaLabel="Filter by status"
          />
          {/* Visible at every width, not sm:hidden like the templates list. That
              one hides it because its table headers are clickable sorters; this
              table has none, so a mobile-only control would leave desktop with
              no way to sort at all. */}
          <div className="relative shrink-0">
            <select
              aria-label="Sort archiving submissions"
              value={sortValue}
              onChange={(e) =>
                setSortValue(e.target.value as (typeof SORT_OPTIONS)[number]['value'])
              }
              className="appearance-none h-[37.5px] pl-[13px] pr-[36px] bg-white border border-[#e8ebf8] rounded-lg font-sans font-semibold text-[13px] text-[#5a6382] cursor-pointer focus:outline-none focus:border-[rgba(112,125,255,0.6)] hover:border-[rgba(112,125,255,0.6)] transition-colors"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-[11px] top-1/2 -translate-y-1/2 size-[13px] text-[#8a93b4]"
              strokeWidth={2}
            />
          </div>
        </div>
      </HeaderBar>

      <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-8 py-6">
        <ChairReviewTable
          submissions={sorted}
          hasAnySubmissions={hasAny}
          onView={handleView}
          onApprove={handleApproveFromTable}
        />
      </div>

      <ChairReviewDetailModal
        submission={selected}
        onClose={handleClose}
        onApproved={handleApproved}
      />
    </>
  )
}

export { ChairReviewTable } from './ChairReviewTable'
export { ChairReviewDetailModal } from './ChairReviewDetailModal'
