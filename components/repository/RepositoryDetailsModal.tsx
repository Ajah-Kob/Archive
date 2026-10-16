'use client'

import { X } from 'lucide-react'
import type { RepositoryArchiveRow } from '@/lib/actions/repository'

export function RepositoryDetailsModal({
  item,
  onClose,
}: {
  item: RepositoryArchiveRow | null
  onClose: () => void
}) {
  if (!item) return null
  const authors = Array.isArray(item.authorOrder) ? item.authorOrder : []
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paper details"
        className="relative w-full max-w-[640px] max-h-[80vh] bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16)] border border-[#eceef8] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#f0f2fa] shrink-0">
          <h2 className="font-heading font-bold text-[15px] leading-[22px] text-[#10133a]">
            Paper Details
          </h2>
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
            <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-2">
              Research Title
            </p>
            <p className="font-sans font-bold text-[14px] leading-[20px] text-[#1e2145] break-words">
              {item.title}
            </p>
          </div>

          <div>
            <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-2">
              Abstract / Overview
            </p>
            <p className="font-sans text-[13px] leading-[20px] text-[#5a6382] whitespace-pre-wrap break-words">
              {item.abstract ?? 'No abstract provided.'}
            </p>
          </div>

          <div>
            <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-2">
              Authors
            </p>
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
                        {a.lastName ? `${a.lastName}, ${a.firstName ?? ''}`.trim() : (a.firstName ?? '—')}
                      </p>
                      <p className="font-sans text-[11.5px] leading-[14px] text-[#8a93b4] truncate">
                        {a.email ?? '—'}
                      </p>
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
