'use client'

import { useState, useMemo } from 'react'
import { Archive, Star, Eye, ExternalLink, X } from 'lucide-react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { formatAuthorsForRepository, formatRepositoryDate } from '@/lib/archiving/validation'
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
        Approved capstones will appear here once the Program Chair publishes them. Check back soon or refine your search.
      </p>
    </div>
  )
}

function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.04)] px-6">
      <div className="size-12 rounded-full bg-[#f4f6ff] border border-[#e5e8ff] flex items-center justify-center mb-4">
        <Archive className="size-5 text-[#707dff]" strokeWidth={1.75} />
      </div>
      <h3 className="font-heading font-bold text-[15px] leading-[22px] text-[#1e2145] tracking-[-0.15px] mb-1">No results found</h3>
      <p className="font-sans font-medium text-[13px] leading-[19.5px] text-[#8a93b4] max-w-sm">
        We couldn’t find anything matching your search. Try a different keyword or clear your filters.
      </p>
    </div>
  )
}

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

export function RepositoryClient({ archives }: RepositoryClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [selected, setSelected] = useState<RepositoryArchiveRow | null>(null)

  const SORT_OPTIONS: FilterOption[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title A-Z' },
  ]

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    let list = archives.filter((item) => {
      if (!term) return true
      const authorsFormatted = formatAuthorsForRepository(item.authorOrder).toLowerCase()
      const tagsJoined = item.tags.join(' ').toLowerCase()
      const title = item.title.toLowerCase()
      const abstract = (item.abstract ?? '').toLowerCase()
      return title.includes(term) || authorsFormatted.includes(term) || abstract.includes(term) || tagsJoined.includes(term)
    })

    if (sortBy === 'newest') {
      list = [...list].sort((a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())
    } else if (sortBy === 'oldest') {
      list = [...list].sort((a, b) => new Date(a.datePublished).getTime() - new Date(b.datePublished).getTime())
    } else if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    }
    return list
  }, [archives, searchTerm, sortBy])

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
          <Filter value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} ariaLabel="Sort by" />
        </div>
      </HeaderBar>

      <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-8 bg-[#f8f9fe] gap-4 overflow-y-auto">
        <div className="flex justify-between items-center text-[11px] font-bold tracking-[0.88px] uppercase text-[#9ea8c6] px-1">
          <span>{filtered.length} RESULTS</span>
          <span>Showing {filtered.length} of {archives.length}</span>
        </div>

        {archives.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <NoResults />
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item) => {
              const authorsLine = formatAuthorsForRepository(item.authorOrder)
              const dateLabel = formatRepositoryDate(item.datePublished)
              const tags = Array.isArray(item.tags) ? item.tags.filter((t) => t.trim().length > 0) : []
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[12px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)] flex overflow-hidden w-full"
                >
                  <div className="w-[5px] bg-[#707dff] shrink-0 self-stretch rounded-l-[12px]" aria-hidden="true" />
                  <div className="flex-1 min-w-0 p-[20px] flex flex-col gap-[12px]">
                    <h2 className="font-heading font-bold text-[15px] leading-[21.75px] tracking-[-0.15px] text-[#10133a] break-words line-clamp-3">
                      {item.title}
                    </h2>

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
                        aria-label="Favorite"
                        className="inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-bold text-[12.5px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors"
                      >
                        <Star className="size-[12px] text-[#5a6382]" strokeWidth={2} />
                        Favorite
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
                      <a
                        href={item.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open document"
                        className="inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-bold text-[12.5px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors"
                      >
                        <ExternalLink className="size-[12px] text-[#5a6382]" strokeWidth={2} />
                        Open
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DetailsModal item={selected} onClose={() => setSelected(null)} />
    </>
  )
}

export default RepositoryClient
