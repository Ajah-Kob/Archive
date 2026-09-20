'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ClipboardCheck, FileText } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { EmptyState } from '@/components/ui/EmptyState'
import type { EvaluationItem } from '@/lib/actions/evaluation'
import { SubmissionDetailsDrawer } from './SubmissionDetailsDrawer'

const GRID_COLS = 'grid-cols-[2fr_0.8fr_0.6fr_0.6fr_0.7fr_0.7fr]'

type SortKey = 'groupName' | 'chapter' | 'submittedBy' | 'dateSubmitted'

type StatusFilter = 'all' | 'PENDING' | 'NEED_REVISION' | 'APPROVED'

const SORT_LABELS: Record<SortKey, string> = {
  groupName: 'Team',
  chapter: 'Chapter',
  submittedBy: 'Submitted by',
  dateSubmitted: 'Date',
}

const CHAPTER_OPTIONS = [
  'Chapter 1',
  'Chapter 2',
  'Chapter 3',
  'Chapter 4',
  'Chapter 5',
] as const

const STATUS_FILTER_OPTIONS: ReadonlyArray<FilterOption> = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'NEED_REVISION', label: 'Need Revision' },
  { value: 'APPROVED', label: 'Approved' },
]

/** Pill badge for the Teams table — colors + labels match SubmissionStatusBadge / StatusCallout. */
const TEAM_STATUS_STYLES = {
  PENDING:
    'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  NEED_REVISION:
    'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)] text-[#e11d48]',
  APPROVED:
    'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
} as const

function TeamsStatusBadge({ status }: { status: EvaluationItem['status'] }) {
  const labels = {
    PENDING: 'In Review',
    NEED_REVISION: 'Needs Revision',
    APPROVED: 'Approved',
  } as const
  return (
    <span
      className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] text-[11px] font-bold leading-[16px] ${TEAM_STATUS_STYLES[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortKey
  label: string
  sortField?: SortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: SortKey) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSort?.(field)}
      className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-bold text-[#9ea8c6] tracking-[0.6px] uppercase hover:text-[#5a6382] transition-colors"
    >
      {label}
      {sortField === field ? (
        sortDir === 'asc' ? (
          <ChevronUp size={12} />
        ) : (
          <ChevronDown size={12} />
        )
      ) : (
        <ChevronUp size={12} className="opacity-50" />
      )}
    </button>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface EvaluationTeamsViewProps {
  items: EvaluationItem[]
}

export function EvaluationTeamsView({ items }: EvaluationTeamsViewProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  // The active table lists PENDING submissions only; archived evaluations
  // (APPROVED / NEED_REVISION) surface through this filter ("All Status"
  // includes them).
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [chapterFilter, setChapterFilter] = useState('all')
  const [sortField, setSortField] = useState<SortKey>('dateSubmitted')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [detailsTarget, setDetailsTarget] = useState<EvaluationItem | null>(
    null,
  )

  const handleSort = (field: SortKey) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir('asc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  const teamOptions = useMemo<FilterOption[]>(() => {
    const names = Array.from(new Set(items.map((i) => i.groupName)))
    return [
      { value: 'all', label: 'All Teams' },
      ...names.map((name) => ({ value: name, label: name })),
    ]
  }, [items])

  const chapterOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'all', label: 'All Chapters' },
      ...CHAPTER_OPTIONS.map((chapter) => ({ value: chapter, label: chapter })),
    ],
    [],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = items.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      if (chapterFilter !== 'all' && i.chapter !== chapterFilter) return false
      if (teamFilter !== 'all' && i.groupName !== teamFilter) return false
      if (!term) return true
      return (
        i.groupName.toLowerCase().includes(term) ||
        i.chapter.toLowerCase().includes(term) ||
        i.submittedBy.toLowerCase().includes(term) ||
        i.fileName.toLowerCase().includes(term)
      )
    })

    rows.sort((a, b) => {
      let cmp = 0
      if (sortField === 'dateSubmitted') {
        cmp = a.dateSubmitted.localeCompare(b.dateSubmitted)
      } else if (sortField === 'submittedBy') {
        cmp = a.submittedBy.localeCompare(b.submittedBy)
      } else if (sortField === 'chapter') {
        cmp = a.chapter.localeCompare(b.chapter)
      } else {
        cmp = a.groupName.localeCompare(b.groupName)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [
    items,
    search,
    teamFilter,
    chapterFilter,
    statusFilter,
    sortField,
    sortDir,
  ])

  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0 overflow-hidden">
        <EmptyState
          heading="No Submissions Yet"
          description="Documents submitted by the groups you advise will appear here for evaluation."
          variant="card"
        />
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2.5 px-5 py-[12px] border-b border-[#f0f2fa] shrink-0">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search teams, chapters…"
            ariaLabel="Search teams and chapters"
            className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
          />

          <Filter
            value={teamFilter}
            options={teamOptions}
            onChange={setTeamFilter}
            ariaLabel="Filter by team"
          />
          <Filter
            value={chapterFilter}
            options={chapterOptions}
            onChange={setChapterFilter}
            ariaLabel="Filter by chapter"
          />
          <Filter
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            ariaLabel="Filter by status"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div
            className={`grid ${GRID_COLS} items-center px-[20px] h-[40px] border-b border-[#f0f2fa] bg-[#fafbff] sticky top-0`}
          >
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <SortHeader
                key={key}
                field={key as SortKey}
                label={label}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
            ))}
            <span className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.6px] uppercase select-none">
              Status
            </span>
            <span>{/* Hidden Action Label */}</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              heading="No Evaluations Found"
              description="No submissions match your search or filter."
              variant="table"
            />
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`w-full grid ${GRID_COLS} items-center px-[20px] h-[58px] border-b border-[#f0f2fa] last:border-b-0 hover:bg-slate-50/60 transition-colors`}
              >
                <span className="min-w-0 pr-4">
                  <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                    {item.groupName}
                  </span>
                  <span className="flex items-center gap-[7px] min-w-0">
                    <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
                      v{item.version}
                    </span>
                    <span className="truncate font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                      {item.fileName} · {formatSize(item.size)}
                    </span>
                  </span>
                </span>

                <span className="min-w-0 pr-4">
                  <span className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                    {item.chapter}
                  </span>
                  <span className="block truncate font-sans font-medium text-[11px] leading-[16px] text-[#9ea8c6]">
                    {item.phase}
                  </span>
                </span>

                <span className="min-w-0 pr-4">
                  <span className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                    {item.submittedBy || 'Unknown'}
                  </span>
                </span>

                <span className="min-w-0 pr-4">
                  <span className="block truncate font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                    {formatDate(item.dateSubmitted)}
                  </span>
                </span>

                <span className="min-w-0 pr-4">
                  <TeamsStatusBadge status={item.status} />
                </span>

                <span className="flex items-center justify-end gap-[6px]">
                  {item.status === 'PENDING' ? (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/faculty/document-review/${item.id}`)
                      }
                      title="Evaluate Document"
                      aria-label={`Evaluate ${item.groupName} ${item.chapter}`}
                      className="flex items-center gap-[5px] h-[28px] px-[11px] bg-[#707dff] rounded-[7px] font-sans font-semibold text-[11px] text-white hover:bg-[#5565ff] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] focus-visible:ring-offset-1"
                    >
                      <ClipboardCheck
                        className="size-[12px]"
                        strokeWidth={2.25}
                      />
                      Evaluate Document
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDetailsTarget(item)}
                      title="View Details"
                      aria-label={`View details of ${item.groupName} ${item.chapter}`}
                      className="flex items-center justify-center size-[30px] rounded-[8px] border bg-white border-[#e8ebf8] text-[#5a6382] hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="size-[15px]" strokeWidth={2.25} />
                    </button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <SubmissionDetailsDrawer
        submission={detailsTarget}
        onClose={() => setDetailsTarget(null)}
      />
    </>
  )
}
