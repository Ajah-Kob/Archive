'use client'

import {
  createContext,
  use,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, History } from 'lucide-react'
import { ContextBar } from '@/components/globals/ContextBar'
import {
  DocumentHistoryDrawer,
  type DocumentHistoryItem,
} from '@/components/milestones/defense/DocumentHistoryDrawer'
import type { DefenseSessionPayload } from '@/lib/actions/defense'
import { deriveResubmissionStatus } from '@/lib/defense/session-helpers'

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Defense session tab keys — `session` shows the initial defense document
 * (verdict 6-state + initial-only LatestDocument + details), `resubmission`
 * shows the latest !isInitial resubmission + approval checklist.
 * Sora for headings, Plus Jakarta Sans for body — same visual language as
 * SectionTabs / ContextBar (bg #eef2ff, border #dfe3fb, responsive).
 */
export type DefenseSessionTabKey = 'session' | 'resubmission'

const TABS: ReadonlyArray<{ key: DefenseSessionTabKey; label: string }> = [
  { key: 'session', label: 'Session' },
  { key: 'resubmission', label: 'Resubmission' },
]

interface DefenseSessionTabsContextValue {
  activeTab: DefenseSessionTabKey
  selectTab: (key: DefenseSessionTabKey) => void
}

// ── Context (composition via createContext + use()) ──────────────────────────

const DefenseSessionTabsContext =
  createContext<DefenseSessionTabsContextValue | null>(null)

function useDefenseSessionTabs(): DefenseSessionTabsContextValue {
  const ctx = use(DefenseSessionTabsContext)
  if (!ctx) {
    throw new Error(
      'DefenseSessionTabs subcomponents must be rendered within DefenseSessionTabs.Root',
    )
  }
  return ctx
}

// ── Pure helpers (<50 lines) ─────────────────────────────────────────────────

function isValidTab(value: string | null): DefenseSessionTabKey | null {
  if (value === 'session' || value === 'resubmission') return value
  return null
}

function resolveInitialTab(
  raw: string | null,
  fallback: DefenseSessionTabKey = 'session',
): DefenseSessionTabKey {
  return isValidTab(raw) ?? fallback
}

function deriveInitialItem(
  session: DefenseSessionPayload,
): DocumentHistoryItem | null {
  const submissions = (
    session as unknown as {
      submissions?: Array<{
        id: number
        isInitial: boolean
        fileName: string
        size: number
        blobUrl: string
        dateSubmitted: string
        version: number
        annotationStats?: { comments: number; pages: number } | null
      }>
    }
  ).submissions
  const initialSubmission = submissions?.find((s) => s.isInitial) ?? null
  if (!initialSubmission) return null

  const ann = (
    initialSubmission as unknown as {
      annotationStats?: { comments: number; pages: number } | null
    }
  ).annotationStats
  const verdictSubmittedAt =
    (session as unknown as { verdictSubmittedAt?: string | null })
      .verdictSubmittedAt ?? null
  const hasStats = ann != null
  const reviewedAt = hasStats && verdictSubmittedAt ? verdictSubmittedAt : null

  return {
    info: {
      id: initialSubmission.id,
      fileName: initialSubmission.fileName,
      size: initialSubmission.size,
      submittedAt: initialSubmission.dateSubmitted,
      blobUrl: initialSubmission.blobUrl,
      submittedByName: session.groupName,
      version: initialSubmission.version,
      comments: ann?.comments ?? null,
      pages: ann?.pages ?? null,
      reviewedAt,
    } as unknown as DocumentHistoryItem['info'],
    status: session.verdict as unknown as DocumentHistoryItem['status'],
  }
}

function deriveResubmissionItems(
  session: DefenseSessionPayload,
): DocumentHistoryItem[] {
  return session.resubmissions.map((r) => {
    const rWithStats = r as unknown as {
      annotationStats?: { comments: number; pages: number } | null
    }
    const verdictSubmittedAt =
      (session as unknown as { verdictSubmittedAt?: string | null })
        .verdictSubmittedAt ?? null
    const hasStats = rWithStats.annotationStats != null
    return {
      info: {
        id: r.id,
        fileName: r.fileName,
        size: r.size,
        submittedAt: r.dateSubmitted,
        blobUrl: r.blobUrl,
        submittedByName: session.groupName,
        version: r.version,
        comments: rWithStats.annotationStats?.comments ?? null,
        pages: rWithStats.annotationStats?.pages ?? null,
        reviewedAt: hasStats ? (verdictSubmittedAt ?? r.dateSubmitted) : null,
      } as unknown as DocumentHistoryItem['info'],
      status: deriveResubmissionStatus(
        r.reviews as unknown as Array<{ status: string }>,
      ) as unknown as DocumentHistoryItem['status'],
    }
  })
}

// ── Tabs bar (h-[40px] with 2px indicator — SectionTabs pattern) ────────────

export function DefenseSessionTabsList() {
  const { activeTab, selectTab } = useDefenseSessionTabs()

  return (
    <div className="flex items-center gap-1 px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => selectTab(tab.key)}
            className={`relative flex items-center h-[40px] px-[14px] font-sans text-[13px] transition-colors shrink-0 ${
              isActive
                ? 'font-bold text-[#707dff]'
                : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Alias for spec prose: Tabs
export const DefenseSessionTabsNav = DefenseSessionTabsList

// ── TabPanel (conditional render via context — no boolean prop proliferation) ─

export interface DefenseSessionTabPanelProps {
  value: DefenseSessionTabKey
  children: ReactNode
  className?: string
}

export function DefenseSessionTabPanel({
  value,
  children,
  className,
}: DefenseSessionTabPanelProps) {
  const { activeTab } = useDefenseSessionTabs()
  if (activeTab !== value) return null
  return <div className={className}>{children}</div>
}

// ── Root (ContextBar + tabs + drawer + scrollable content) ───────────────────

export interface DefenseSessionTabsRootProps {
  children?: ReactNode
  backHref?: string
  defaultTab?: DefenseSessionTabKey
  initial?: DocumentHistoryItem | null
  resubmissions?: DocumentHistoryItem[]
  scheduleId?: number
  session?: DefenseSessionPayload
  className?: string
}

/**
 * DefenseSessionTabs.Root — shell for the defense session page.
 * Renders DefenseSessionContextBar (Back to Defense + Document History,
 * py-[14px] px-8 bg #eef2ff border #dfe3fb) + h-[40px] tabs with 2px active
 * indicator matching the SectionTabs pattern, preserves DocumentHistoryDrawer
 * (open/close, initial + resubmissions, scheduleId), and syncs tab state via
 * useState + router.replace ?tab=session|resubmission (defaults to session).
 * Uses createContext + use() composition with no boolean prop proliferation.
 */
export function DefenseSessionTabsRoot({
  children,
  backHref = '/faculty/defense',
  defaultTab = 'session',
  initial,
  resubmissions,
  scheduleId,
  session,
  className,
}: DefenseSessionTabsRootProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const paramTab = searchParams.get('tab')
  const initialTab = resolveInitialTab(paramTab, defaultTab)
  const [activeTab, setActiveTabState] = useState<DefenseSessionTabKey>(initialTab)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Resolve drawer props: explicit props win; otherwise derive from session if present.
  const resolvedInitial =
    initial !== undefined ? initial : session ? deriveInitialItem(session) : null
  const resolvedResubmissions =
    resubmissions !== undefined
      ? resubmissions
      : session
        ? deriveResubmissionItems(session)
        : []
  const resolvedScheduleId =
    scheduleId !== undefined ? scheduleId : session ? session.id : undefined

  function selectTab(key: DefenseSessionTabKey) {
    setActiveTabState(key)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', key)
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Normalize "/defense" shorthand to real faculty route for the back button.
  const target = backHref === '/defense' ? '/faculty/defense' : backHref

  return (
    <DefenseSessionTabsContext value={{ activeTab, selectTab }}>
      <div
        className={[
          'flex flex-col flex-1 min-h-0 overflow-hidden',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <ContextBar
          actions={
            <>
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-[7px] h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
              >
                <History className="size-3.5" />
                Document History
              </button>
              <button
                type="button"
                onClick={() => router.push(target)}
                className="flex items-center gap-[7px] h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </button>
            </>
          }
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={`relative flex items-center h-[40px] px-[14px] font-sans text-[13px] transition-colors shrink-0 ${
                  isActive
                    ? 'font-bold text-[#707dff]'
                    : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />
                )}
              </button>
            )
          })}
        </ContextBar>
        <div className="flex-1 min-h-0 overflow-y-auto p-[30px] flex flex-col overscroll-contain">
          {children}
        </div>
      </div>

      <DocumentHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        initial={resolvedInitial}
        resubmissions={resolvedResubmissions}
        scheduleId={resolvedScheduleId}
      />
    </DefenseSessionTabsContext>
  )
}

// ── Compound export (spec: DefenseSessionTabs.Root + Tabs + TabPanel) ────────

export const DefenseSessionTabs = {
  Root: DefenseSessionTabsRoot,
  Tabs: DefenseSessionTabsList,
  TabPanel: DefenseSessionTabPanel,
  // aliases for flexible import paths
  List: DefenseSessionTabsList,
  Panel: DefenseSessionTabPanel,
}

// Default export for convenience
export default DefenseSessionTabs
