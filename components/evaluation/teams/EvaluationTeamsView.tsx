'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ClipboardCheck, FileText, Search } from 'lucide-react'
import type { EvaluationItem } from '@/lib/actions/evaluation'
import { SubmissionDetailsDrawer } from './SubmissionDetailsDrawer'

const GRID_COLS = 'grid-cols-[2fr_0.8fr_0.6fr_0.6fr_0.4fr]'

type SortKey = 'groupName' | 'chapter' | 'submittedBy' | 'dateSubmitted'

const SORT_LABELS: Record<SortKey, string> = {
  groupName: 'Team',
  chapter: 'Chapter',
  submittedBy: 'Submitted by',
  dateSubmitted: 'Date',
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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortField, setSortField] = useState<SortKey>('dateSubmitted')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [detailsTarget, setDetailsTarget] = useState<EvaluationItem | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSort = (field: SortKey) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir('asc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  const groupNames = useMemo(
    () => Array.from(new Set(items.map((i) => i.groupName))),
    [items],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = items.filter((i) => {
      if (filter !== 'all' && i.groupName !== filter) return false
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
  }, [items, search, filter, sortField, sortDir])

  const actionButtonClass =
    'flex items-center justify-center size-[30px] rounded-[8px] border transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

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

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex gap-[7px] items-center h-[37.5px] px-[14px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-semibold text-[13px] text-[#5a6382]"
            >
              {filter === 'all' ? 'All Teams' : filter}
              <ChevronDown className="size-[13px]" />
            </button>
            {filterOpen && (
              <div className="absolute left-0 top-full z-10 pt-1">
                <div className="bg-white border border-[#eceef8] rounded-[10px] w-[168px] py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]">
                  <button
                    type="button"
                    onClick={() => {
                      setFilter('all')
                      setFilterOpen(false)
                    }}
                    className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                      filter === 'all' ? 'text-[#707dff]' : 'text-[#3d4566]'
                    }`}
                  >
                    All Teams
                  </button>
                  {groupNames.length > 0 && (
                    <>
                      <div className="mx-[10px] h-px bg-[#f0f2fa]" />
                      {groupNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setFilter(name)
                            setFilterOpen(false)
                          }}
                          className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                            filter === name
                              ? 'text-[#707dff]'
                              : 'text-[#3d4566]'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
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

                <span className="flex items-center justify-end gap-[6px]">
                  <button
                    type="button"
                    onClick={() => setDetailsTarget(item)}
                    title="View Details"
                    aria-label={`View details of ${item.groupName} ${item.chapter}`}
                    className={`${actionButtonClass} bg-white border-[#e8ebf8] text-[#5a6382] hover:bg-gray-50`}
                  >
                    <FileText className="size-[15px]" strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsTarget(item)}
                    title="Evaluate"
                    aria-label={`Evaluate ${item.groupName} ${item.chapter}`}
                    className={`${actionButtonClass} bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.25)] text-[#16a34a] hover:bg-[rgba(34,197,94,0.16)]`}
                  >
                    <ClipboardCheck className="size-[15px]" strokeWidth={2.25} />
                  </button>
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