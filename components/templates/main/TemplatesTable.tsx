'use client'

import { AlertCircle, FolderOpen, ChevronUp, ChevronDown } from 'lucide-react'
import { FileIcon } from '@/components/ui/FileIcon'
import { UserProfile } from '@/components/ui/UserProfile'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActionMenu, type ActionItem } from '@/components/ui/ActionMenu'
import TableSkeleton from './TableSkeleton'

export interface TemplateItem {
  id: number
  name: string
  dateUploaded: string
  rawCreatedAt: string
  uploadedBy: string
  uploadedByEmail: string
  size: string
  rawSize: number
  fileUrl: string
}

interface TemplateTableProps {
  templates: TemplateItem[]
  error?: string | null
  loading?: boolean
  isEmpty?: boolean
  getRowActions?: (item: TemplateItem) => ActionItem[]
  sortField?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (field: string) => void
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: string
  label: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (field: string) => void
}) {
  return (
    <div
      className="flex items-center gap-1 cursor-pointer select-none font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase"
      onClick={() => onSort?.(field)}
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
    </div>
  )
}

// Weighted to max content: NAME widest (file name + icon), UPLOADED BY next (avatar+name+email), DATE fixed short, SIZE smallest (e.g. "2.4 MB"), ACTION fixed 80px
const GRID_COLS = 'grid-cols-[1.9fr_0.9fr_1.4fr_0.6fr_80px]'

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function TemplateTable({
  templates,
  error,
  loading,
  isEmpty,
  getRowActions,
  sortField,
  sortDir,
  onSort,
}: TemplateTableProps) {
  return (
    <>
      <style>{`
        .templates-grid-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .templates-grid-scroll::-webkit-scrollbar-track {
          background: #f0f2fa;
          border-radius: 999px;
        }
        .templates-grid-scroll::-webkit-scrollbar-thumb {
          background: #c8cde0;
          border-radius: 999px;
        }
        .templates-grid-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8aec8;
        }
        .templates-grid-scroll {
          overflow-y: auto;
          overflow-x: auto;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: #c8cde0 #f0f2fa;
        }
      `}</style>
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-x-auto flex-1 min-h-0 templates-grid-scroll">
          {/* min-w keeps columns readable on small screens — name (1.9fr) stays widest */}
          <div className="min-w-[720px] flex flex-col min-h-full">
            {/* Header row — font style matches defense scheduling */}
            <div className="bg-[#fafbff] shrink-0 border-b border-[#f0f2fa] rounded-t-[14px]">
              <div className={`grid ${GRID_COLS} px-[20px] h-[39px] items-center`}>
                <SortHeader
                  field="name"
                  label="NAME"
                  {...{ sortField, sortDir, onSort }}
                />
                <SortHeader
                  field="date"
                  label="DATE UPLOADED"
                  {...{ sortField, sortDir, onSort }}
                />
                <SortHeader
                  field="uploadedBy"
                  label="UPLOADED BY"
                  {...{ sortField, sortDir, onSort }}
                />
                <SortHeader
                  field="size"
                  label="SIZE"
                  {...{ sortField, sortDir, onSort }}
                />
                <div></div>
              </div>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : error ? (
              <div className="flex-1 min-h-0 flex items-center justify-center py-12">
                <EmptyState
                  icon={<AlertCircle size={24} className="text-red-500" />}
                  heading="Failed to Load Templates"
                  description={error}
                />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex-1 min-h-0 flex items-center justify-center py-12">
                {isEmpty ? (
                  <EmptyState
                    icon={<FolderOpen size={24} className="text-slate-400" />}
                    heading="No templates uploaded yet"
                    description="Wait for the template uploads."
                  />
                ) : (
                  <EmptyState
                    icon={<FolderOpen size={24} className="text-slate-400" />}
                    heading="No templates found"
                    description="We couldn't find any documents matching your current search."
                  />
                )}
              </div>
            ) : (
              templates.map((item) => (
                <div
                  key={item.id}
                  className={`grid ${GRID_COLS} px-[20px] h-[60px] items-center border-b border-[#f0f2fa] last:border-b-0 hover:bg-slate-50/40 transition-colors`}
                >
                  <div className="flex items-center gap-[12px] min-w-0 pr-4">
                    <FileIcon filename={item.name} />
                    <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                      {item.name}
                    </span>
                  </div>
                  <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pr-4">
                    {item.dateUploaded}
                  </span>
                  <div className="min-w-0 pr-4">
                    <UserProfile
                      initials={getInitials(item.uploadedBy)}
                      name={item.uploadedBy}
                      email={item.uploadedByEmail}
                    />
                  </div>
                  <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#5a6382] pr-4">
                    {item.size}
                  </span>
                  <div className="flex justify-end">
                    {getRowActions && <ActionMenu items={getRowActions(item)} />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
