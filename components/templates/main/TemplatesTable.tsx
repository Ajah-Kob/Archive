'use client'

import { AlertCircle, FolderOpen, ChevronUp, ChevronDown } from 'lucide-react'
import { FileIcon } from '@/components/ui/FileIcon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActionMenu, type ActionItem } from '@/components/ui/ActionMenu'
import TableSkeleton from './TableSkeleton'

export interface TemplateItem {
  id: number
  name: string
  dateUploaded: string
  rawCreatedAt: string
  uploadedBy: string
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

function UserAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div
      className="size-[24px] rounded-[12px] flex items-center justify-center shrink-0"
      style={{
        backgroundImage:
          'linear-gradient(135deg, rgb(112,125,255), rgb(85,101,255))',
      }}
    >
      <span className="text-[9px] font-bold text-white leading-none">
        {initial}
      </span>
    </div>
  )
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
      className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase"
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

const GRID_COLS = 'grid-cols-[1fr_170px_170px_90px_80px]'

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
  if (loading) {
    return <TableSkeleton />
  }

  if (error) {
    return (
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
        <EmptyState
          icon={<AlertCircle size={24} className="text-red-500" />}
          heading="Failed to Load Templates"
          description={error}
        />
      </div>
    )
  }

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
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: #c8cde0 #f0f2fa;
        }
        .header-grid-gutter {
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          -ms-overflow-style: none;
        }
        .header-grid-gutter::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        {/* Header row */}
        <div className="bg-[#f8f9fe] rounded-t-[14px] shrink-0 header-grid-gutter">
          <div
            className={`grid ${GRID_COLS} px-[20px] py-[15px] border-b border-[#eceef8] items-center`}
          >
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

        {templates.length === 0 ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
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
          /* Scrollable body */
          <div className="overflow-x-auto flex-1 min-h-0 templates-grid-scroll">
            {templates.map((item) => (
              <div
                key={item.id}
                className={`grid ${GRID_COLS} px-[20px] h-[63px] items-center border-b border-[#f0f2fa] hover:bg-slate-50/40 transition-colors`}
              >
                <div className="flex items-center gap-[12px] min-w-0">
                  <FileIcon filename={item.name} />
                  <span className="text-[13px] font-semibold text-[#1e2145] truncate">
                    {item.name}
                  </span>
                </div>
                <span className="text-[12.5px] font-medium text-[#6b7399] whitespace-nowrap">
                  {item.dateUploaded}
                </span>
                <div className="flex items-center gap-[8px] min-w-0">
                  <UserAvatar name={item.uploadedBy} />
                  <span className="text-[12.5px] font-medium text-[#6b7399] truncate">
                    {item.uploadedBy}
                  </span>
                </div>
                <span className="text-[12.5px] font-medium text-[#9ea8c6] whitespace-nowrap">
                  {item.size}
                </span>
                <div className="flex justify-end">
                  {getRowActions && <ActionMenu items={getRowActions(item)} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
