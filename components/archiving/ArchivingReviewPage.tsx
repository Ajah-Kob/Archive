'use client'

import { useState, useMemo } from 'react'
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
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search group, section, title, authors…"
            ariaLabel="Search archiving submissions"
            className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
          />
          <Filter
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
            ariaLabel="Filter by status"
          />
        </div>
      </HeaderBar>

      <div className="flex-1 flex flex-col min-h-0 px-8 py-6">
        <ChairReviewTable
          submissions={filtered}
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
