'use client'

import { FileClock, User, Hash, Globe, Calendar } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import type { AuditLogRow } from './AuditTable'

interface AuditDetailDrawerProps {
  log: AuditLogRow | null
  onClose: () => void
}

function formatFullDate(value: string | Date): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function prettyJson(value: unknown): string {
  if (value == null) return '—'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

type DiffEntry = {
  key: string
  before: unknown
  after: unknown
  status: 'added' | 'removed' | 'changed' | 'unchanged'
}

function buildDiff(before: unknown, after: unknown): DiffEntry[] {
  const isPlainObject = (v: unknown): boolean =>
    v != null && typeof v === 'object' && !Array.isArray(v) && (v as object).constructor === Object

  if (!isPlainObject(before) && !isPlainObject(after)) return []

  const b = (before as Record<string, unknown>) ?? {}
  const a = (after as Record<string, unknown>) ?? {}
  const keys = new Set([...Object.keys(b), ...Object.keys(a)])
  const out: DiffEntry[] = []
  for (const key of Array.from(keys).sort()) {
    const hasBefore = Object.prototype.hasOwnProperty.call(b, key)
    const hasAfter = Object.prototype.hasOwnProperty.call(a, key)
    const bv = b[key]
    const av = a[key]
    const same = JSON.stringify(bv) === JSON.stringify(av)
    if (!hasBefore && hasAfter) out.push({ key, before: undefined, after: av, status: 'added' })
    else if (hasBefore && !hasAfter) out.push({ key, before: bv, after: undefined, status: 'removed' })
    else if (!same) out.push({ key, before: bv, after: av, status: 'changed' })
    else out.push({ key, before: bv, after: av, status: 'unchanged' })
  }
  return out
}

function DiffHighlight({
  before,
  after,
}: {
  before: unknown
  after: unknown
}) {
  const diff = buildDiff(before, after)
  const hasObjectDiff = diff.length > 0
  const beforeStr = prettyJson(before)
  const afterStr = prettyJson(after)
  const same = beforeStr === afterStr

  return (
    <div className={hasObjectDiff ? 'flex flex-col gap-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
      {hasObjectDiff ? (
        <>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-semibold text-amber-700">
              <span className="size-2 rounded-full bg-amber-400" /> changed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-semibold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-400" /> added
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 font-semibold text-red-700">
              <span className="size-2 rounded-full bg-red-400" /> removed
            </span>
          </div>
          <div className="grid gap-2">
            {diff.map((entry) => {
              const statusColor =
                entry.status === 'added'
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : entry.status === 'removed'
                    ? 'border-red-200 bg-red-50/70'
                    : entry.status === 'changed'
                      ? 'border-amber-200 bg-amber-50/60'
                      : 'border-[#e8ebf8] bg-white'
              const labelColor =
                entry.status === 'added'
                  ? 'text-emerald-700'
                  : entry.status === 'removed'
                    ? 'text-red-700'
                    : entry.status === 'changed'
                      ? 'text-amber-700'
                      : 'text-[#9ea8c6]'
              if (entry.status === 'unchanged') return null
              return (
                <div key={entry.key} className={`rounded-[10px] border px-3 py-2.5 flex flex-col gap-1.5 ${statusColor}`}>
                  <span className={`font-mono font-bold text-[12px] ${labelColor}`}>{entry.key}</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <span className="font-sans font-bold text-[10px] tracking-[0.08em] uppercase text-[#9ea8c6]">Before</span>
                      <pre className="mt-1 rounded-[8px] bg-white/80 border border-black/5 p-2 text-[11.5px] leading-[16px] text-[#3d4566] whitespace-pre-wrap break-words">
                        {entry.before === undefined ? '—' : prettyJson(entry.before)}
                      </pre>
                    </div>
                    <div className="min-w-0">
                      <span className="font-sans font-bold text-[10px] tracking-[0.08em] uppercase text-[#9ea8c6]">After</span>
                      <pre className="mt-1 rounded-[8px] bg-white/90 border border-black/5 p-2 text-[11.5px] leading-[16px] text-[#1e2145] whitespace-pre-wrap break-words">
                        {entry.after === undefined ? '—' : prettyJson(entry.after)}
                      </pre>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="font-sans font-bold text-[11px] tracking-[0.08em] uppercase text-[#9ea8c6]">Before</span>
            <pre className="rounded-[10px] border border-[#e8ebf8] bg-[#fafbff] p-3 text-[12px] leading-[18px] text-[#3d4566] whitespace-pre-wrap break-words overflow-auto max-h-[320px]">
              {beforeStr}
            </pre>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-sans font-bold text-[11px] tracking-[0.08em] uppercase text-[#9ea8c6]">After</span>
            <pre className={`rounded-[10px] border p-3 text-[12px] leading-[18px] whitespace-pre-wrap break-words overflow-auto max-h-[320px] ${same ? 'border-[#e8ebf8] bg-[#fafbff] text-[#3d4566]' : 'border-[rgba(112,125,255,0.18)] bg-[#f4f6ff] text-[#1e2145]'}`}>
              {afterStr}
            </pre>
          </div>
        </>
      )}
      <details hidden={!hasObjectDiff} className="rounded-[10px] border border-[#e8ebf8] bg-white overflow-hidden">
        <summary className="cursor-pointer select-none px-3 py-2 font-sans font-semibold text-[12px] text-[#5a6382] hover:bg-[#fafbff]">Show full JSON</summary>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 border-t border-[#f0f2fa] bg-[#fafbff]/50">
          <pre className="rounded-[10px] border border-[#e8ebf8] bg-white p-3 text-[11.5px] leading-[16px] text-[#3d4566] whitespace-pre-wrap break-words overflow-auto max-h-[280px]">{prettyJson(before)}</pre>
          <pre className="rounded-[10px] border border-[#e8ebf8] bg-white p-3 text-[11.5px] leading-[16px] text-[#1e2145] whitespace-pre-wrap break-words overflow-auto max-h-[280px]">{prettyJson(after)}</pre>
        </div>
      </details>
    </div>
  )
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="font-heading font-bold text-[11px] uppercase tracking-[0.08em] text-[#bbc0d8] flex items-center gap-1.5">
      {icon}
      {children}
    </p>
  )
}

export function AuditDetailDrawer({ log, onClose }: AuditDetailDrawerProps) {
  return (
    <Drawer open={log != null} onClose={onClose} size="md">
      <Drawer.Header
        title="Audit Details"
        subtitle={log ? `#${log.id} · ${log.action}` : 'Audit entry details.'}
      />
      <Drawer.Body>
        <div className="flex flex-col gap-6 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-[30px] rounded-[10px] bg-[#eef2ff] border border-[#dfe3fb] flex items-center justify-center shrink-0">
                <FileClock className="size-[14px] text-[#707dff]" />
              </div>
            </div>
            {log ? (
              <span className="hidden sm:inline-flex items-center rounded-full bg-[#eef2ff] border border-[#dfe3fb] px-2.5 py-1 text-[11px] font-semibold text-[#43489a]">
                {log.action}
              </span>
            ) : null}
          </div>

          {log ? (
            <>
              <div>
                <SectionLabel icon={<User className="size-[12px]" />}>Actor Snapshot</SectionLabel>
                <div className="mt-2 rounded-[12px] border border-[#e8ebf8] bg-[#fafbff] p-4 flex flex-col gap-2">
                  <p className="font-sans font-bold text-[13px] text-[#10133a]">{log.actorName}</p>
                  <p className="font-sans text-[12.5px] text-[#5a6382] break-all">
                    {log.actorEmail} · <span className="font-semibold text-[#707dff]">{log.actorRole}</span>
                    {log.actorId != null ? <span className="text-[#8a93b4]"> · ID {log.actorId}</span> : null}
                  </p>
                </div>
              </div>

              <div>
                <SectionLabel icon={<Hash className="size-[12px]" />}>Target</SectionLabel>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-[10px] border border-[#e8ebf8] bg-white p-3">
                    <p className="font-sans font-bold text-[10px] tracking-[0.08em] uppercase text-[#9ea8c6]">Entity</p>
                    <p className="font-sans font-semibold text-[13px] text-[#1e2145] mt-1">{log.entity}</p>
                  </div>
                  <div className="rounded-[10px] border border-[#e8ebf8] bg-white p-3">
                    <p className="font-sans font-bold text-[10px] tracking-[0.08em] uppercase text-[#9ea8c6]">Entity ID</p>
                    <p className="font-mono font-medium text-[13px] text-[#1e2145] mt-1 break-all">{log.entityId ?? '—'}</p>
                  </div>
                  <div className="rounded-[10px] border border-[#e8ebf8] bg-white p-3">
                    <p className="font-sans font-bold text-[10px] tracking-[0.08em] uppercase text-[#9ea8c6]">Name</p>
                    <p className="font-sans font-semibold text-[13px] text-[#1e2145] mt-1 truncate" title={log.entityName ?? undefined}>
                      {log.entityName ?? '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SectionLabel icon={<Calendar className="size-[12px]" />}>Created At</SectionLabel>
                  <p className="mt-2 font-sans font-medium text-[12.5px] text-[#1e2145] bg-white border border-[#e8ebf8] rounded-[10px] px-3 py-2.5">
                    {formatFullDate(log.createdAt)}
                  </p>
                </div>
                <div>
                  <SectionLabel icon={<Globe className="size-[12px]" />}>IP Address</SectionLabel>
                  <p className="mt-2 font-mono font-medium text-[12.5px] text-[#1e2145] bg-white border border-[#e8ebf8] rounded-[10px] px-3 py-2.5 truncate">
                    {log.ip ?? '—'}
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {/* Keep the diff disclosure mounted while closed so its open state survives reopen. */}
          <div hidden={!log}>
            <SectionLabel>Before → After</SectionLabel>
            <div className="mt-2">
              <DiffHighlight before={log?.before} after={log?.after} />
            </div>
          </div>
        </div>
      </Drawer.Body>

      <Drawer.Footer>
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit details"
            className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] text-[#5a6382] hover:bg-[#f8f9ff] transition-colors"
          >
            Close
          </button>
        </div>
      </Drawer.Footer>
    </Drawer>
  )
}

export default AuditDetailDrawer
