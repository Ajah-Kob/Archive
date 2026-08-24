'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ClipboardCheck, FileText, Search } from 'lucide-react'
import type { EvaluationItem } from '@/lib/actions/evaluation'
import { SubmissionDetailsDrawer } from './SubmissionDetailsDrawer'

const GRID_COLS = 'grid-cols-[2fr_0.8fr_0.6fr_0.6fr_0.7fr_0.55fr]'

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

const STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: StatusFilter
  label: string
}> = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'NEED_REVISION', label: 'Need Revision' },
  { value: 'APPROVED', label: 'Approved' },
]

/** Pill badge for the Teams table — labels per the evaluation spec. */
const TEAM_STATUS_STYLES = {
  PENDING: 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.2)] text-[#707dff]',
  NEED_REVISION:
    'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  APPROVED: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
} as const

function TeamsStatusBadge({ status }: { status: EvaluationItem['status'] }) {
  const labels = {
    PENDING: 'Pending',
    NEED_REVISION: 'Need Revision',
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

interface FilterOption {
  value: string
  label: string
}

/**
 * Self-contained dropdown filter (trigger + menu + click-outside close).
 * Clones the pill-dropdown markup previously inlined for the team filter so
 * the toolbar can host several filters without duplicated state wiring.
 */
function FilterDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string
  options: ReadonlyArray<FilterOption>
  onChange: (value: string) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? options[0]?.label ?? ''

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(!open)}
        className="flex gap-[7px] items-center h-[37.5px] px-[14px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-semibold text-[13px] text-[#5a6382]"
      >
        {selectedLabel}
        <ChevronDown className="size-[13px]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 pt-1">
          <div className="bg-white border border-[#eceef8] rounded-[10px] w-[168px] py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]">
            {options.map((option, index) => (
              <div key={option.value}>
                {index > 0 && index === 1 && (
                  <div className="mx-[10px] h-px bg-[#f0f2fa]" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                    value === option.value ? 'text-[#707dff]' : 'text-[#3d4566]'
                  }`}
                >
                  {option.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [detailsTarget, setDetailsTarget] = useState<EvaluationItem | null>(null)

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
  }, [items, search, teamFilter, chapterFilter, statusFilter, sortField, sortDir])

  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col items-center justify-center px-10 py-16">
        <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
          <ClipboardCheck className="size-5 text-[#707dff]" strokeWidth={1.75} />
        </div>
        <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
          No Submissions Yet
        </h3>
        <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
          Documents submitted by the groups you advise will appear here for
          evaluation.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2.5 px-5 py-[12px] border-b border-[#f0f2fa] shrink-0">
          <div className="relative flex-[0_0_320px] max-w-[320px] min-w-[180px]">
            <Search className="absolute left-[12.5px] top-1/2 -translate-y-1/2 size-[10px] text-[#8a93b4]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams, chapters…"
              className="w-full h-[37.5px] pl-[33px] pr-[13px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-medium text-[13px] text-[rgba(16,19,58,0.5)] placeholder:text-[rgba(16,19,58,0.5)] outline-none"
            />
          </div>

          <FilterDropdown
            value={teamFilter}
            options={teamOptions}
            onChange={setTeamFilter}
            ariaLabel="Filter by team"
          />
          <FilterDropdown
            value={chapterFilter}
            options={chapterOptions}
            onChange={setChapterFilter}
            ariaLabel="Filter by chapter"
          />
          <FilterDropdown
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
            <div className="flex flex-col items-center justify-center px-10 py-16 w-full">
              <FileText className="size-8 text-[#c4cadf] mb-3" strokeWidth={1.5} />
              <h3 className="font-heading font-bold text-[14px] leading-[21px] text-[#3d4566] tracking-[-0.14px] text-center mb-1">
                No Evaluations Found
              </h3>
              <p className="font-sans font-medium text-[12.5px] leading-[20px] text-[#8a93b4] text-center max-w-[340px]">
                No submissions match your search or filter.
              </p>
            </div>
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
                  <span className="block truncate font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                    {item.fileName} · {formatSize(item.size)}
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
                  <span className="block truncate font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                    {formatDate(item.dateSubmitted)}
                  </span>
                </span>

                <span className="min-w-0 pr-4">
                  <span className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                    {item.submittedBy || 'Unknown'}
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
                        router.push(`/faculty/evaluation/${item.id}`)
                      }
                      title="Evaluate Document"
                      aria-label={`Evaluate ${item.groupName} ${item.chapter}`}
                      className="flex items-center gap-[5px] h-[28px] px-[11px] bg-[#707dff] rounded-[7px] font-sans font-semibold text-[11px] text-white hover:bg-[#5565ff] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] focus-visible:ring-offset-1"
                    >
                      <ClipboardCheck className="size-[12px]" strokeWidth={2.25} />
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
