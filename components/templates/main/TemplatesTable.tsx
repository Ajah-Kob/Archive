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
      .templates-table-scroll::-webkit-scrollbar {
        width: 5px;
        height: 5px;
      }
      .templates-table-scroll::-webkit-scrollbar-track {
        background: #f0f2fa;
        border-radius: 999px;
      }
      .templates-table-scroll::-webkit-scrollbar-thumb {
        background: #c8cde0;
        border-radius: 999px;
      }
      .templates-table-scroll::-webkit-scrollbar-thumb:hover {
        background: #a8aec8;
      }
      .templates-table-scroll {
        scrollbar-gutter: stable;
        scrollbar-width: thin;
        scrollbar-color: #c8cde0 #f0f2fa;
      }
      .header-scrollbar-hidden {
        overflow-y: auto;
        scrollbar-gutter: stable;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .header-scrollbar-hidden::-webkit-scrollbar {
        display: none;
      }
    `}</style>
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        {/* Header table — forced scrollbar gutter for alignment */}
        <div className="flex-shrink-0 header-scrollbar-hidden overflow-hidden rounded-t-[14px]">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-[#f8f9fe] border-b border-[#eceef8]">
                <th className="py-[15px] px-[20px] text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase text-left w-auto cursor-pointer select-none" onClick={() => onSort?.('name')}>
                  <span className="flex items-center gap-1">
                    NAME
                    {sortField === 'name' ? (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                      <ChevronUp size={12} className="opacity-30" />
                    )}
                  </span>
                </th>
                <th className="py-[15px] px-[20px] text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase text-left w-[148px] cursor-pointer select-none" onClick={() => onSort?.('date')}>
                  <span className="flex items-center gap-1">
                    DATE UPLOADED
                    {sortField === 'date' ? (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                      <ChevronUp size={12} className="opacity-30" />
                    )}
                  </span>
                </th>
                <th className="py-[15px] px-[20px] text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase text-left w-[170px] cursor-pointer select-none" onClick={() => onSort?.('uploadedBy')}>
                  <span className="flex items-center gap-1">
                    UPLOADED BY
                    {sortField === 'uploadedBy' ? (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                      <ChevronUp size={12} className="opacity-30" />
                    )}
                  </span>
                </th>
                <th className="py-[15px] px-[20px] text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase text-left w-[90px] cursor-pointer select-none" onClick={() => onSort?.('size')}>
                  <span className="flex items-center gap-1">
                    SIZE
                    {sortField === 'size' ? (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                      <ChevronUp size={12} className="opacity-30" />
                    )}
                  </span>
                </th>
                <th className="w-[80px]"></th>
              </tr>
            </thead>
          </table>
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
          /* Body table — scrollable */
          <div className="overflow-x-auto overflow-y-auto min-h-0 flex-1 templates-table-scroll">
            <table className="w-full table-fixed border-collapse">
              <tbody>
                {templates.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#f0f2fa] hover:bg-slate-50/40 transition-colors"
                  >
                    <td className="px-[20px] h-[63px]">
                      <div className="flex items-center gap-[12px]">
                        <FileIcon filename={item.name} />
                        <span className="text-[13px] font-semibold text-[#1e2145] truncate">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-[20px] h-[63px] text-[12.5px] font-medium text-[#6b7399] whitespace-nowrap w-[148px]">
                      {item.dateUploaded}
                    </td>
                    <td className="px-[20px] h-[63px] w-[170px]">
                      <div className="flex items-center gap-[8px]">
                        <UserAvatar name={item.uploadedBy} />
                        <span className="text-[12.5px] font-medium text-[#6b7399] truncate">
                          {item.uploadedBy}
                        </span>
                      </div>
                    </td>
                    <td className="px-[20px] h-[63px] text-[12.5px] font-medium text-[#9ea8c6] whitespace-nowrap w-[90px]">
                      {item.size}
                    </td>
                    <td className="px-[20px] h-[63px] text-right w-[80px]">
                      {getRowActions && (
                        <ActionMenu items={getRowActions(item)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
