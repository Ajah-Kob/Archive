'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  RotateCcw,
  Search,
} from 'lucide-react'
import type { PendingTopic } from '@/lib/actions/sections'
import { TopicReviewModal } from './TopicReviewModal'
import { ApproveTopicModal } from './ApproveTopicModal'
import { TopicDetailsDrawer } from './TopicDetailsDrawer'

const GRID_COLS = 'grid-cols-[0.5fr_2fr_0.5fr_0.3fr_0.3fr]'

interface TopicReviewQueueProps {
  topics: PendingTopic[]
}

type SortKey = 'groupName' | 'title' | 'submittedBy' | 'createdAt'

const SORT_LABELS: Record<SortKey, string> = {
  groupName: 'Group',
  title: 'Topic',
  submittedBy: 'Submitted by',
  createdAt: 'Date',
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

export function TopicReviewQueue({ topics }: TopicReviewQueueProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortField, setSortField] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [approveTarget, setApproveTarget] = useState<PendingTopic | null>(null)
  const [revisionTarget, setRevisionTarget] = useState<PendingTopic | null>(
    null,
  )
  const [detailsTarget, setDetailsTarget] = useState<PendingTopic | null>(null)
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
    () => Array.from(new Set(topics.map((t) => t.groupName))),
    [topics],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = topics.filter((t) => {
      if (filter !== 'all' && t.groupName !== filter) return false
      if (!term) return true
      return (
        t.groupName.toLowerCase().includes(term) ||
        t.title.toLowerCase().includes(term) ||
        t.submittedBy.toLowerCase().includes(term) ||
        t.members.some((m) => m.name.toLowerCase().includes(term))
      )
    })

    rows.sort((a, b) => {
      let cmp = 0
      if (sortField === 'createdAt') {
        cmp = a.createdAt.localeCompare(b.createdAt)
      } else if (sortField === 'submittedBy') {
        cmp = a.submittedBy.localeCompare(b.submittedBy)
      } else if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title)
      } else {
        cmp = a.groupName.localeCompare(b.groupName)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [topics, search, filter, sortField, sortDir])

  const actionButtonClass =
    'flex items-center justify-center size-[30px] rounded-[8px] border transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

  if (topics.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col items-center justify-center px-10 py-16">
        <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
          <FileText className="size-5 text-[#707dff]" strokeWidth={1.75} />
        </div>
        <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
          No Pending Topic Reviews
        </h3>
        <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
          Topics submitted by groups in this section will appear here for your
          review.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2.5 p-5 border-b border-[#f0f2fa] shrink-0">
          <div className="relative flex-[0_0_320px] max-w-[320px] min-w-[180px]">
            <Search className="absolute left-[12.5px] top-1/2 -translate-y-1/2 size-[10px] text-[#8a93b4]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics…"
              className="w-full h-[37.5px] pl-[33px] pr-[13px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-medium text-[13px] text-[rgba(16,19,58,0.5)] placeholder:text-[rgba(16,19,58,0.5)] outline-none"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex gap-[7px] items-center h-[37.5px] px-[14px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-semibold text-[13px] text-[#5a6382]"
            >
              {filter === 'all' ? 'All Groups' : filter}
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
                    All Groups
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
            <span>{/*Hiden Action Label */}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-10 py-16 w-full">
              <h3 className="font-heading font-bold text-[14px] leading-[21px] text-[#3d4566] tracking-[-0.14px] text-center mb-1">
                No Topics Found
              </h3>
              <p className="font-sans font-medium text-[12.5px] leading-[20px] text-[#8a93b4] text-center max-w-[340px]">
                No topics match your search or filter.
              </p>
            </div>
          ) : (
            filtered.map((topic) => (
              <div
                key={topic.id}
                className={`w-full grid ${GRID_COLS} items-center px-[20px] h-[58px] border-b border-[#f0f2fa] last:border-b-0 hover:bg-slate-50/60 transition-colors`}
              >
                <span className="min-w-0 pr-4">
                  <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                    {topic.groupName}
                  </span>
                </span>

                <span className="min-w-0 pr-4">
                  <span className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                    {topic.title}
                  </span>
                </span>

                <span className="min-w-0 pr-4">
                  <span className="block truncate font-sans font-medium text-[12.5px] leading-[18.75px] text-[#6b7399]">
                    {topic.submittedBy || 'Unknown'}
                  </span>
                </span>

                <span className="pr-4 font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                  {formatDate(topic.createdAt)}
                </span>

                <span className="flex items-center justify-end gap-[6px]">
                  <button
                    type="button"
                    onClick={() => setApproveTarget(topic)}
                    title="Approve"
                    aria-label={`Approve topic ${topic.title}`}
                    className={`${actionButtonClass} bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.25)] text-[#16a34a] hover:bg-[rgba(34,197,94,0.16)]`}
                  >
                    <CheckCircle2 className="size-[15px]" strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevisionTarget(topic)}
                    title="Request Revision"
                    aria-label={`Request revision for topic ${topic.title}`}
                    className={`${actionButtonClass} bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.25)] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.16)]`}
                  >
                    <RotateCcw className="size-[15px]" strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsTarget(topic)}
                    title="View Details"
                    aria-label={`View details of topic ${topic.title}`}
                    className={`${actionButtonClass} bg-white border-[#e8ebf8] text-[#5a6382] hover:bg-gray-50`}
                  >
                    <Eye className="size-[15px]" strokeWidth={2.25} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <ApproveTopicModal
        topic={approveTarget}
        onClose={() => setApproveTarget(null)}
      />
      <TopicReviewModal
        topic={revisionTarget}
        onClose={() => setRevisionTarget(null)}
      />
      <TopicDetailsDrawer
        topic={detailsTarget}
        onClose={() => setDetailsTarget(null)}
      />
    </>
  )
}
