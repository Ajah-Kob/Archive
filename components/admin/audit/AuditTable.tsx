'use client'

import { Eye } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export interface AuditLogRow {
  id: number
  actorId: number | null
  actorName: string
  actorEmail: string
  actorRole: string
  action: string
  entity: string
  entityId: string | null
  entityName: string | null
  before: unknown
  after: unknown
  ip: string | null
  createdAt: string | Date
}

interface AuditTableProps {
  logs: AuditLogRow[]
  loading?: boolean
  error?: string | null
  onSelect: (log: AuditLogRow) => void
  isEmpty?: boolean
}

function formatAuditDate(value: string | Date): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#eef2ff] border border-[#dfe3fb] px-2.5 py-1 text-[11px] font-semibold text-[#43489a] leading-none whitespace-nowrap">
      {action}
    </span>
  )
}

// Weighted columns: Time fixed, Actor flex, Action fixed, Entity fixed, EntityName flex, IP fixed, View fixed
const GRID_COLS = 'grid-cols-[160px_1.5fr_150px_130px_1.3fr_110px_72px]'

function TableSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`grid ${GRID_COLS} px-[20px] h-[56px] items-center border-b border-[#f0f2fa] animate-pulse`}
        >
          <div className="h-3 w-[110px] rounded bg-[#f0f2fa]" />
          <div className="flex flex-col gap-1.5 pr-4">
            <div className="h-3 w-[120px] rounded bg-[#f0f2fa]" />
            <div className="h-2 w-[160px] rounded bg-[#f8f9fe]" />
          </div>
          <div className="h-5 w-[110px] rounded-full bg-[#eef2ff]" />
          <div className="h-3 w-[90px] rounded bg-[#f0f2fa]" />
          <div className="h-3 w-[140px] rounded bg-[#f0f2fa]" />
          <div className="h-3 w-[80px] rounded bg-[#f0f2fa]" />
          <div className="h-7 w-[56px] rounded-lg bg-[#f0f2fa]" />
        </div>
      ))}
    </div>
  )
}

export function AuditTable({ logs, loading, error, onSelect, isEmpty }: AuditTableProps) {
  if (loading) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="bg-[#fafbff] shrink-0 border-b border-[#f0f2fa] rounded-t-[14px]">
          <div className={`grid ${GRID_COLS} px-[20px] h-[39px] items-center`}>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Time
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Actor
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Action
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Target
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Summary
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              IP
            </span>
            <span />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <TableSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
        <EmptyState heading="Failed to Load Audit Logs" description={error} variant="table" />
      </div>
    )
  }

  return (
    <>
      <style>{`
        .audit-grid-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .audit-grid-scroll::-webkit-scrollbar-track {
          background: #f0f2fa;
          border-radius: 999px;
        }
        .audit-grid-scroll::-webkit-scrollbar-thumb {
          background: #c8cde0;
          border-radius: 999px;
        }
        .audit-grid-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8aec8;
        }
        .audit-grid-scroll {
          scrollbar-width: thin;
          scrollbar-color: #c8cde0 #f0f2fa;
        }
      `}</style>
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-auto flex-1 min-h-0 audit-grid-scroll">
          <div className="min-w-[980px] flex flex-col min-h-full">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-[#fafbff] shrink-0 border-b border-[#f0f2fa] rounded-t-[14px]">
              <div className={`grid ${GRID_COLS} px-[20px] h-[39px] items-center`}>
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
                  Time
                </span>
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
                  Actor
                </span>
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
                  Action
                </span>
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
                  Target
                </span>
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
                  Summary
                </span>
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
                  IP
                </span>
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase text-right pr-2">
                  View
                </span>
              </div>
            </div>

            {logs.length === 0 ? (
              <EmptyState
                heading={isEmpty ? 'No Audit Entries Yet' : 'No Audit Entries Found'}
                description={
                  isEmpty
                    ? 'Business-critical mutations will appear here once they occur.'
                    : "We couldn't find any entries matching your current filters."
                }
                variant="table"
              />
            ) : (
              logs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => onSelect(log)}
                  className={`grid ${GRID_COLS} px-[20px] min-h-[56px] py-2.5 items-center border-b border-[#f0f2fa] last:border-b-0 hover:bg-[#f8f9ff] transition-colors text-left w-full`}
                >
                  <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18px] text-[#8a93b4] pr-4">
                    {formatAuditDate(log.createdAt)}
                  </span>
                  <div className="min-w-0 pr-4 flex flex-col">
                    <span className="truncate font-sans font-semibold text-[13px] leading-[19px] text-[#1e2145]">
                      {log.actorName}
                    </span>
                    <span className="truncate font-sans font-medium text-[12px] leading-[16px] text-[#8a93b4]">
                      {log.actorEmail} · {log.actorRole}
                    </span>
                  </div>
                  <span className="pr-4">
                    <ActionBadge action={log.action} />
                  </span>
                  <span className="truncate font-sans font-medium text-[12.5px] leading-[18px] text-[#1e2145] pr-4">
                    {log.entity}
                    {log.entityId ? (
                      <span className="text-[#8a93b4] font-normal"> #{log.entityId}</span>
                    ) : null}
                  </span>
                  <span className="truncate font-sans font-medium text-[12.5px] leading-[18px] text-[#5a6382] pr-4" title={log.entityName ?? undefined}>
                    {log.entityName ?? '—'}
                  </span>
                  <span className="whitespace-nowrap font-mono font-medium text-[12px] leading-[16px] text-[#6b7399] pr-4">
                    {log.ip ?? '—'}
                  </span>
                  <span className="flex justify-end">
                    <span className="inline-flex items-center justify-center gap-1 h-[30px] px-3 rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[12px] text-[#5a6382] group-hover:border-[#dfe3fb] transition-colors">
                      <Eye className="size-[13px]" />
                      View
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default AuditTable
