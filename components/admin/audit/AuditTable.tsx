'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Eye } from 'lucide-react'
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
  sortField?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (field: string) => void
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
    <span className="inline-flex items-center rounded-full bg-[#eef2ff] border border-[#dfe3fb] px-2.5 py-1 text-[11px] font-semibold text-[#43489a] leading-none whitespace-nowrap max-w-full overflow-hidden">
      <span className="truncate">{action}</span>
    </span>
  )
}

// Resizable columns: px defaults, Actor/Summary flex; drag a header edge to
// resize, clamped to per-column minimums so content never collapses.
const DEFAULT_COLS: (number | null)[] = [160, null, 150, 130, null, 72]
const FLEX_COLS = ['1.5fr', '1.3fr']
const MIN_COLS = [120, 180, 110, 100, 160, 56]
const MAX_COLS = [240, 480, 260, 240, 560, 200]
const HEADERS = ['Time', 'Actor', 'Action', 'Target', 'Summary', 'View']
// Header label → AuditLog field. View has none — it never sorts.
const SORT_FIELDS: (string | null)[] = [
  'createdAt',
  'actorName',
  'action',
  'entity',
  'entityName',
  null,
]

function buildTemplate(widths: (number | null)[]): string {
  let flexSeen = 0
  return DEFAULT_COLS.map((d, i) => {
    const w = widths[i] ?? d
    if (w != null) return `${w}px`
    return FLEX_COLS[flexSeen++]
  }).join(' ')
}

function TableSkeleton({ template }: { template: string }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid px-[20px] h-[56px] items-center border-b border-[#f0f2fa] animate-pulse [&>*]:min-w-0"
            style={{ gridTemplateColumns: template }}
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

export function AuditTable({ logs, loading, error, onSelect, isEmpty, sortField, sortDir, onSort }: AuditTableProps) {
  const [widths, setWidths] = useState<(number | null)[]>(Array(6).fill(null))
  const dragRef = useRef<{ index: number; startX: number; startW: number } | null>(null)
  // Set when a drag actually moved — the click landing after mouseup must not sort
  const suppressSortRef = useRef(false)
  const template = buildTemplate(widths)

  // Locked-width resize: dragging handle i moves the boundary between column
  // i and i+1 — the neighbor absorbs the exact delta so the table total never
  // changes and no horizontal overflow appears. Stops when either side hits
  // its min/max. Flex columns convert to measured px on first touch. The last
  // column's handle is mirrored: it moves the boundary with its left neighbor.
  function startResize(e: React.MouseEvent, index: number, flip = false) {
    e.preventDefault()
    // Handle → cell → header row: measure sibling cells, not the handle itself
    const row = (e.currentTarget as HTMLElement).parentElement?.parentElement ?? null
    const cells = row ? (Array.from(row.children) as HTMLElement[]) : []
    const idx = flip ? index - 1 : index
    const px = (i: number): number => {
      const s = widths[i] ?? DEFAULT_COLS[i]
      if (s != null) return s
      return cells[i]?.getBoundingClientRect().width ?? MIN_COLS[i]
    }
    const baseA = px(idx)
    const baseB = px(idx + 1)
    dragRef.current = { index, startX: e.clientX, startW: baseA }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    function onMove(ev: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      const dx = (ev.clientX - d.startX) * (flip ? -1 : 1)
      // A real drag (not a click) — swallow the click that lands on mouseup
      if (Math.abs(ev.clientX - d.startX) > 3) suppressSortRef.current = true
      let ni = Math.min(MAX_COLS[idx], Math.max(MIN_COLS[idx], baseA + dx))
      const give = ni - baseA
      let nj = Math.min(MAX_COLS[idx + 1], Math.max(MIN_COLS[idx + 1], baseB - give))
      ni = Math.min(
        MAX_COLS[idx],
        Math.max(MIN_COLS[idx], baseA + (baseB - nj)),
      )
      setWidths((prev) => {
        const copy = [...prev]
        copy[idx] = Math.round(ni)
        copy[idx + 1] = Math.round(nj)
        return copy
      })
    }
    function onUp() {
      dragRef.current = null
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function headerCells() {
    return HEADERS.map((label, i) => {
      const field = SORT_FIELDS[i]
      const sortable = field != null && onSort != null
      return (
        <span
          key={label}
          onClick={sortable ? () => {
            if (suppressSortRef.current) {
              suppressSortRef.current = false
              return
            }
            onSort(field)
          } : undefined}
          className={`group relative flex items-center gap-1 font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase${sortable ? ' cursor-pointer select-none' : ''}`}
        >
          {label}
          {sortable &&
            (sortField === field ? (
              sortDir === 'asc' ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              )
            ) : (
              <ChevronUp size={12} className="opacity-50" />
            ))}
          {i < HEADERS.length - 1 ? (
            <span
              role="separator"
              aria-label={`Resize ${label} column`}
              onMouseDown={(e) => {
                e.stopPropagation()
                startResize(e, i)
              }}
              className="absolute right-0 top-1 bottom-1 w-2 cursor-col-resize flex justify-end"
            >
              <span className="w-px h-full bg-[#707dff]/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          ) : (
            <span
              role="separator"
              aria-label="Resize View column"
              onMouseDown={(e) => {
                e.stopPropagation()
                startResize(e, i, true)
              }}
              className="absolute right-0 top-1 bottom-1 w-2 cursor-col-resize flex justify-end"
            >
              <span className="w-px h-full bg-[#707dff]/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          )}
        </span>
      )
    })
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="bg-[#fafbff] shrink-0 border-b border-[#f0f2fa] rounded-t-[14px]">
          <div className="grid px-[20px] h-[39px] items-center [&>*]:min-w-0" style={{ gridTemplateColumns: template }}>
            {headerCells()}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <TableSkeleton template={template} />
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
          {/* ponytail: static 870px floor predates resizing; derive from MIN_COLS + fr floors if it ever drifts */}
          <div className="min-w-[870px] flex flex-col min-h-full">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-[#fafbff] shrink-0 border-b border-[#f0f2fa] rounded-t-[14px]">
              <div className="grid px-[20px] h-[39px] items-center [&>*]:min-w-0" style={{ gridTemplateColumns: template }}>
                {headerCells()}
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
                  className="grid px-[20px] min-h-[56px] py-2.5 items-center border-b border-[#f0f2fa] last:border-b-0 hover:bg-[#f8f9ff] transition-colors text-left w-full [&>*]:min-w-0"
                  style={{ gridTemplateColumns: template }}
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
