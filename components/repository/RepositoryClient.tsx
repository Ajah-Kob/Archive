'use client'

import { useState, useMemo } from 'react'
import {
  Archive,
  Star,
  Calendar,
  ExternalLink,
  Users,
  FileText,
} from 'lucide-react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import {
  formatAuthorsForRepository,
  formatRepositoryDate,
} from '@/lib/archiving/validation'
import type { RepositoryArchiveRow } from '@/lib/actions/repository'

interface RepositoryClientProps {
  archives: RepositoryArchiveRow[]
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.04)]">
      <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
        <Archive className="size-5 text-[#707dff]" strokeWidth={1.75} />
      </div>
      <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#10133a] tracking-[-0.16px] mb-2">
        No archived capstones yet
      </h3>
      <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] max-w-sm px-4">
        Approved capstones will appear here once the Program Chair publishes
        them. Check back soon or refine your search.
      </p>
    </div>
  )
}

function NoResults({ term }: { term: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-white border border-[#e8ebf8] rounded-[14px]">
      <p className="font-sans font-medium text-[13px] text-[#8a93b4]">
        No results for{' '}
        <span className="font-semibold text-[#1e2145]">&quot;{term}&quot;</span>
      </p>
      <p className="font-sans text-[12px] text-[#9ea8c6] mt-1">
        Try a different keyword, title, author, or tag.
      </p>
    </div>
  )
}

export function RepositoryClient({ archives }: RepositoryClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('newest')

  const SORT_OPTIONS: FilterOption[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title A-Z' },
  ]

  const allTags = useMemo(() => {
    const set = new Set<string>()
    archives.forEach((a) => a.tags.forEach((t) => set.add(t)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [archives])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    let list = archives.filter((item) => {
      if (selectedTag && !item.tags.includes(selectedTag)) return false
      if (!term) return true
      const authorsFormatted = formatAuthorsForRepository(
        item.authorOrder,
      ).toLowerCase()
      const tagsJoined = item.tags.join(' ').toLowerCase()
      const title = item.title.toLowerCase()
      const abstract = (item.abstract ?? '').toLowerCase()
      return (
        title.includes(term) ||
        authorsFormatted.includes(term) ||
        abstract.includes(term) ||
        tagsJoined.includes(term)
      )
    })

    // Sort
    if (sortBy === 'newest') {
      list = [...list].sort(
        (a, b) =>
          new Date(b.datePublished).getTime() -
          new Date(a.datePublished).getTime(),
      )
    } else if (sortBy === 'oldest') {
      list = [...list].sort(
        (a, b) =>
          new Date(a.datePublished).getTime() -
          new Date(b.datePublished).getTime(),
      )
    } else if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    }
    return list
  }, [archives, searchTerm, selectedTag, sortBy])

  const tagFilterOptions: FilterOption[] = [
    { value: '', label: 'All Tags' },
    ...allTags.map((t) => ({ value: t, label: t })),
  ]

  return (
    <>
      <HeaderBar>
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by title, keyword, author, or section..."
            ariaLabel="Search repository"
            className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
            clearable
          />
          <Filter
            value={selectedTag ?? ''}
            options={tagFilterOptions}
            onChange={(v) => setSelectedTag(v ? v : null)}
            ariaLabel="Filter by tag"
          />
          <Filter
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
            ariaLabel="Sort by"
          />
        </div>
      </HeaderBar>

      <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-8 gap-4 overflow-y-auto">
        {/* Tag pills row + Results counter */}
        <div className="flex flex-col gap-3">
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-[8px]">
              <span className="font-sans font-bold text-[11px] tracking-[0.6px] uppercase text-[#9ea8c6] mr-1">
                Filter by tag:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`h-[23px] px-[9px] py-[2px] rounded-full border font-sans font-semibold text-[11px] leading-[16.5px] whitespace-nowrap transition-colors ${
                  selectedTag === null
                    ? 'bg-[#707dff] border-[#707dff] text-white shadow-[0_1px_4px_rgba(112,125,255,0.3)]'
                    : 'bg-[#f4f6ff] border-[#e5e8ff] text-[#707dff] hover:bg-[#eef0ff]'
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedTag((prev) => (prev === tag ? null : tag))
                  }
                  className={`h-[23px] px-[9px] py-[2px] rounded-full border font-sans font-semibold text-[11px] leading-[16.5px] whitespace-nowrap transition-colors ${
                    selectedTag === tag
                      ? 'bg-[#707dff] border-[#707dff] text-white shadow-[0_1px_4px_rgba(112,125,255,0.3)]'
                      : 'bg-[#f4f6ff] border-[#e5e8ff] text-[#707dff] hover:bg-[#eef0ff]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center text-[11px] font-bold tracking-[0.88px] uppercase text-[#9ea8c6] px-1">
            <span>{filtered.length} RESULTS</span>
            <span>
              Showing {filtered.length} of {archives.length}
            </span>
          </div>
        </div>

        {archives.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <NoResults term={searchTerm} />
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item) => {
              const authorsLine = formatAuthorsForRepository(item.authorOrder)
              const dateLabel = formatRepositoryDate(item.datePublished)
              const tags = Array.isArray(item.tags)
                ? item.tags.filter((t) => t.trim().length > 0)
                : []
              return (
                <div
                  key={item.id}
                  className="bg-white border-l-[5px] border-l-[#707dff] border border-[#e8ebf8] rounded-[14px] p-6 shadow-[0_2px_12px_rgba(30,58,138,0.04)] flex flex-col gap-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-heading font-bold text-[15px] leading-[21.75px] tracking-[-0.15px] text-[#10133a] break-words">
                      {item.title}
                    </h2>
                    <button
                      type="button"
                      aria-label="Favorite"
                      className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg border border-[#e8ebf8] shrink-0 bg-white hover:bg-[#f8f9ff] transition-colors"
                    >
                      <Star size={16} />
                    </button>
                  </div>

                  <div className="flex items-start gap-2 text-[12.5px] leading-[18.75px] font-medium text-[#8a93b4] break-words">
                    <Users
                      size={14}
                      className="text-slate-400 shrink-0 mt-[2px]"
                    />
                    <span className="break-words">
                      Published {dateLabel}
                      {authorsLine ? ` · ${authorsLine}` : ''}
                    </span>
                  </div>

                  <p className="font-sans font-normal text-[12.5px] leading-[20.625px] text-[#6b7399] break-words whitespace-pre-wrap line-clamp-4">
                    {item.abstract ?? 'No abstract provided.'}
                  </p>

                  {tags.length > 0 && (
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
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 mt-1 border-t border-[#f0f2fa]">
                    <span className="text-xs text-[#9ea8c6] flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400 shrink-0" />{' '}
                      {dateLabel}
                      <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 text-[#8a93b4]">
                        <FileText size={12} className="text-slate-400" />
                        {item.fileName}
                      </span>
                    </span>
                    <a
                      href={item.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 bg-white border border-[#e8ebf8] hover:bg-slate-50 text-indigo-600 rounded-xl text-xs font-semibold gap-1.5 shadow-sm transition-colors shrink-0"
                    >
                      View Paper <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export default RepositoryClient
