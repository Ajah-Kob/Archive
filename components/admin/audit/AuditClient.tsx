'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getAuditLogs } from '@/lib/actions/audit'
import { AuditFilters } from './AuditFilters'
import { AuditTable, type AuditLogRow } from './AuditTable'
import { AuditDetailDrawer } from './AuditDetailDrawer'

interface AuditClientProps {
  initialLogs: AuditLogRow[]
  initialTotalCount: number
  initialTotalPages: number
  initialPerPage?: number
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const

export function AuditClient({
  initialLogs,
  initialTotalCount,
  initialTotalPages,
  initialPerPage = 20,
}: AuditClientProps) {
  // Filter state
  const [actorDraft, setActorDraft] = useState('')
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [start, setStart] = useState<Date | null>(null)
  const [end, setEnd] = useState<Date | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(initialPerPage)
  const [pageInput, setPageInput] = useState('1')

  // Data state
  const [logs, setLogs] = useState<AuditLogRow[]>(initialLogs)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AuditLogRow | null>(null)

  const isFirstMount = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep pageInput in sync with page
  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  // Debounce actor search (300ms) and reset to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setActor((prev) => {
        if (prev === actorDraft) return prev
        setPage(1)
        return actorDraft
      })
      // If draft equals current actor but we still want to avoid extra fetch on mount,
      // the main fetch effect will handle it.
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [actorDraft])

  const fetchLogs = useCallback(
    async (params: {
      p: number
      pp: number
      actorVal: string
      actionVal: string
      entityVal: string
      startVal: Date | null
      endVal: Date | null
    }) => {
      setLoading(true)
      setError(null)
      try {
        const res = await getAuditLogs({
          page: params.p,
          perPage: params.pp,
          actor: params.actorVal || undefined,
          action: params.actionVal || undefined,
          entity: params.entityVal || undefined,
          from: params.startVal,
          to: params.endVal,
        })
        if (res.success) {
          setLogs(res.logs as AuditLogRow[])
          setTotalCount(res.totalCount)
          setTotalPages(res.totalPages)
        } else {
          setError(res.message ?? 'Failed to load audit logs')
        }
      } catch {
        setError('Failed to load audit logs')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // Main fetch effect: server-driven pagination, filters reset to page 1
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    fetchLogs({
      p: page,
      pp: perPage,
      actorVal: actor,
      actionVal: action,
      entityVal: entity,
      startVal: start,
      endVal: end,
    })
  }, [actor, action, entity, start, end, page, perPage, fetchLogs])

  function handleActionChange(v: string) {
    setAction(v)
    setPage(1)
  }

  function handleEntityChange(v: string) {
    setEntity(v)
    setPage(1)
  }

  function handleStartChange(v: Date | null) {
    setStart(v)
    setPage(1)
  }

  function handleEndChange(v: Date | null) {
    setEnd(v)
    setPage(1)
  }

  function handlePerPageChange(v: number) {
    setPerPage(v)
    setPage(1)
  }

  function commitPageInput() {
    const n = parseInt(pageInput, 10)
    if (Number.isNaN(n)) {
      setPageInput(String(page))
      return
    }
    const clamped = Math.min(Math.max(1, n), Math.max(1, totalPages))
    if (clamped !== page) setPage(clamped)
    else setPageInput(String(clamped))
  }

  const isEmptyFilters = !actor && !action && !entity && !start && !end

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <AuditFilters
        actor={actorDraft}
        onActorChange={setActorDraft}
        actionValue={action}
        onActionChange={handleActionChange}
        entityValue={entity}
        onEntityChange={handleEntityChange}
        start={start}
        end={end}
        onStartChange={handleStartChange}
        onEndChange={handleEndChange}
      />

      <div className="flex-1 min-h-0 flex flex-col px-8 pt-[16px] pb-[24px] gap-3 overflow-hidden">
        {/* Count line */}
        <div className="flex items-center justify-between px-1 shrink-0">
          <span className="text-[13px] font-semibold text-[#6b7399]">
            {loading ? 'Loading…' : `${totalCount} ${totalCount === 1 ? 'entry' : 'entries'}`}
          </span>
          <span className="text-[12px] font-medium text-[#8a93b4] hidden sm:inline">
            Admin-only · business writes only
          </span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <AuditTable
            logs={logs}
            loading={loading}
            error={error}
            onSelect={setSelected}
            isEmpty={isEmptyFilters && logs.length === 0}
          />
        </div>

        {/* Footer pinned shrink-0 */}
        <div className="shrink-0 flex-none flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12.5px] font-medium text-[#5a6382]">
              <span className="hidden sm:inline">Rows per page</span>
              <span className="sm:hidden">Rows</span>
              <select
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="h-[32px] px-2.5 pr-7 bg-white border border-[#e8ebf8] rounded-[9px] text-[13px] font-semibold text-[#1e2145] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.18)] focus:border-[#707dff] transition-all"
                aria-label="Rows per page"
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="hidden md:inline text-[12px] text-[#8a93b4] border-l border-[#f0f2fa] pl-3">
              {totalCount} total
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-medium text-[#5a6382] hidden sm:inline">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitPageInput()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                className="w-[64px] h-[32px] px-2 text-center bg-white border border-[#e8ebf8] rounded-[9px] text-[13px] font-semibold text-[#1e2145] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.18)] focus:border-[#707dff] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Page number"
              />
              <span className="text-[12.5px] font-medium text-[#8a93b4] whitespace-nowrap">/ {totalPages}</span>
            </div>

            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="inline-flex items-center justify-center size-[32px] rounded-[9px] bg-white border border-[#e8ebf8] text-[#5a6382] hover:bg-[#fafbff] hover:border-[#dfe3fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-[14px]" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                aria-label="Next page"
                className="inline-flex items-center justify-center size-[32px] rounded-[9px] bg-white border border-[#e8ebf8] text-[#5a6382] hover:bg-[#fafbff] hover:border-[#dfe3fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="size-[14px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AuditDetailDrawer log={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

export default AuditClient
