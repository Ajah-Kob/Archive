'use client'

import { useEffect, useState } from 'react'
import { Activity, Check, Copy, FileUp, Flag, Layers, PenLine, Shield, UserPlus, Users } from 'lucide-react'
import { getSectionActivityFeed, type SectionActivityEntry } from '@/lib/actions/section-activity'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const ACTION_META: Record<string, { Icon: typeof Activity; tile: string; tone: string }> = {
  GROUP_CREATE: { Icon: Users, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  GROUP_RENAME: { Icon: PenLine, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  GROUP_JOIN: { Icon: UserPlus, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  GROUP_LEAVE: { Icon: Users, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  GROUP_REMOVE_MEMBER: { Icon: Users, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  GROUP_TRANSFER: { Icon: Users, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  GROUP_INVITE_SEND: { Icon: UserPlus, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  GROUP_INVITE_CANCEL: { Icon: UserPlus, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  ADVISER_INVITE_SEND: { Icon: UserPlus, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  ADVISER_INVITE_CANCEL: { Icon: UserPlus, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  ADVISER_ASSIGNED: { Icon: Shield, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  SECTION_CREATE: { Icon: Layers, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  SECTION_UPDATE: { Icon: Layers, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  SECTION_ARCHIVE: { Icon: Layers, tile: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]', tone: 'text-[#e11d48]' },
  SECTION_COORDINATOR_ASSIGN: { Icon: Shield, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  SECTION_COORDINATOR_REASSIGN: { Icon: Shield, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  SECTION_JOIN_CODE_REGENERATE: { Icon: Copy, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  STUDENT_REMOVE_SECTION: { Icon: Users, tile: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]', tone: 'text-[#e11d48]' },
  MILESTONE_AVAILABILITY_SET: { Icon: Flag, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  PHASE_AVAILABILITY_SET: { Icon: Flag, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  CHAPTER_SUBMIT: { Icon: FileUp, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  CHAPTER_RESUBMIT: { Icon: FileUp, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  CHAPTER_REVIEW: { Icon: Check, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  DEFENSE_SCHEDULE_CREATE: { Icon: Shield, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  DEFENSE_SCHEDULE_UPDATE: { Icon: Shield, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  DEFENSE_RESCHEDULE: { Icon: Shield, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  DEFENSE_VERDICT: { Icon: Check, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  DEFENSE_DOCUMENT_SUBMIT: { Icon: FileUp, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  DEFENSE_DOCUMENT_RESUBMIT: { Icon: FileUp, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  DEFENSE_DOCUMENT_REPLACE: { Icon: FileUp, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  DEFENSE_RESUBMISSION_REVIEW: { Icon: Check, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  ARCHIVING_SUBMIT: { Icon: FileUp, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  ARCHIVING_APPROVE: { Icon: Check, tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]', tone: 'text-[#16a34a]' },
  TOPIC_SAVE: { Icon: Flag, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  FACULTY_JOIN: { Icon: UserPlus, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' },
  FACULTY_REMOVE: { Icon: Users, tile: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]', tone: 'text-[#e11d48]' },
}

const FALLBACK_META = { Icon: Activity, tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]', tone: 'text-[#707dff]' }

function actionMeta(action: string) {
  return ACTION_META[action] ?? FALLBACK_META
}

function describe(entry: SectionActivityEntry): string {
  const name = entry.entityName ?? entry.entity
  switch (entry.action) {
    case 'GROUP_CREATE': return 'Group created'
    case 'GROUP_RENAME': return `Group renamed to ${name}`
    case 'GROUP_JOIN': return `${name} joined the section`
    case 'GROUP_LEAVE': return `${name} left the group`
    case 'GROUP_REMOVE_MEMBER': return `${name} was removed from the group`
    case 'GROUP_TRANSFER': return `Leadership transferred to ${name}`
    case 'GROUP_INVITE_SEND': return `Group invitation sent to ${name}`
    case 'GROUP_INVITE_CANCEL': return `Group invitation to ${name} cancelled`
    case 'ADVISER_INVITE_SEND': return `Adviser invitation sent to ${name}`
    case 'ADVISER_INVITE_CANCEL': return `Adviser invitation to ${name} cancelled`
    case 'ADVISER_ASSIGNED': return `${name} assigned as adviser`
    case 'SECTION_CREATE': return `Section ${name} created`
    case 'SECTION_UPDATE': return `Section ${name} updated`
    case 'SECTION_ARCHIVE': return `Section ${name} archived`
    case 'SECTION_COORDINATOR_ASSIGN': return `${name} assigned as coordinator`
    case 'SECTION_COORDINATOR_REASSIGN': return `Coordinator reassigned to ${name}`
    case 'SECTION_JOIN_CODE_REGENERATE': return 'Join code regenerated'
    case 'STUDENT_REMOVE_SECTION': return `${name} removed from the section`
    case 'MILESTONE_AVAILABILITY_SET': return `Milestone ${name} ${entry.after && typeof entry.after === 'object' && 'open' in entry.after && entry.after.open ? 'unlocked' : 'locked'}`
    case 'PHASE_AVAILABILITY_SET': return `Phase ${name} ${entry.after && typeof entry.after === 'object' && 'open' in entry.after && entry.after.open ? 'unlocked' : 'locked'}`
    case 'CHAPTER_SUBMIT': return `${name} submitted for review`
    case 'CHAPTER_RESUBMIT': return `${name} resubmitted for review`
    case 'CHAPTER_REVIEW': return `${name} reviewed — ${String(entry.after ?? '').replace(/_/g, ' ').toLowerCase()}`
    case 'DEFENSE_SCHEDULE_CREATE': return `Defense scheduled — ${name}`
    case 'DEFENSE_SCHEDULE_UPDATE': return `Defense schedule updated — ${name}`
    case 'DEFENSE_RESCHEDULE': return `Defense rescheduled — ${name}`
    case 'DEFENSE_VERDICT': return `Verdict submitted — ${String(entry.after ?? '').replace(/_/g, ' ').toLowerCase()}`
    case 'DEFENSE_DOCUMENT_SUBMIT': return `${name} submitted`
    case 'DEFENSE_DOCUMENT_RESUBMIT': return `${name} resubmitted`
    case 'DEFENSE_DOCUMENT_REPLACE': return `${name} replaced`
    case 'DEFENSE_RESUBMISSION_REVIEW': return `Resubmission reviewed — ${String(entry.after ?? '').replace(/_/g, ' ').toLowerCase()}`
    case 'ARCHIVING_SUBMIT': return `${name} submitted for archiving`
    case 'ARCHIVING_APPROVE': return `${name} approved and published`
    case 'TOPIC_SAVE': return `Topic saved — ${name}`
    case 'FACULTY_JOIN': return `${name} joined as faculty`
    case 'FACULTY_REMOVE': return `${name} removed from faculty`
    default: return entry.action.replace(/_/g, ' ').toLowerCase()
  }
}

/**
 * Section activity feed — read-only timeline of what has happened in this
 * section. Mirrors the resubmission feed's visual language (icon tile, rail,
 * actor + description + timestamp) but scoped to the section.
 *
 * Rendered inside the coordinator workspace; the page already gates access.
 */
export function SectionActivityFeed({ sectionId }: { sectionId: number }) {
  const [entries, setEntries] = useState<SectionActivityEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        console.log('[ActivityFeed] fetching for sectionId:', sectionId)
        const res = await getSectionActivityFeed(sectionId)
        console.log('[ActivityFeed] response:', res)
        if (cancelled) return
        if (res.success && res.payload) {
          setEntries(res.payload)
          setError(false)
        } else {
          console.warn('[ActivityFeed] action returned error:', res.message)
          setError(true)
        }
      } catch (err) {
        console.error('[ActivityFeed] fetch threw:', err)
        if (!cancelled) setError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sectionId])

  if (error) {
    return (
      <div className="rounded-[14px] border border-[#eceef8] bg-white p-5 shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
        <h2 className="font-['Sora',sans-serif] font-bold text-[13.5px] text-[#1e3a8a]">Activity</h2>
        <p className="mt-2 font-sans text-[12.5px] text-[#8a93b4]">
          Could not load activity. Please try again.
        </p>
      </div>
    )
  }

  if (entries === null) {
    return (
      <div className="rounded-[14px] border border-[#eceef8] bg-white p-5 shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
        <h2 className="font-['Sora',sans-serif] font-bold text-[13.5px] text-[#1e3a8a]">Activity</h2>
        <p className="mt-2 font-sans text-[12.5px] text-[#8a93b4]">Loading activity…</p>
      </div>
    )
  }

  return (
    <div className="rounded-[14px] border border-[#eceef8] bg-white p-5 shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
      <h2 className="font-['Sora',sans-serif] font-bold text-[13.5px] text-[#1e3a8a]">Activity</h2>
      {entries.length === 0 ? (
        <p className="mt-2 font-sans text-[12.5px] text-[#8a93b4]">
          No activity yet. Events in this section will appear here.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col">
          {entries.map((entry, index) => {
            const { Icon, tile, tone } = actionMeta(entry.action)
            const isLast = index === entries.length - 1
            return (
              <li key={entry.id} className="flex gap-[12px]">
                <div className="flex flex-col items-center self-stretch shrink-0 pt-[2px]">
                  <span className={`flex size-[28px] items-center justify-center rounded-full border shrink-0 ${tile}`}>
                    <Icon className={`size-[13px] ${tone}`} strokeWidth={2} />
                  </span>
                  {isLast ? null : (
                    <span className="w-px flex-1 min-h-[20px] bg-[#eceef8]" aria-hidden="true" />
                  )}
                </div>
                <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-[16px]'}`}>
                  <p className="font-sans font-semibold text-[12.5px] leading-[18px] text-[#3d4566]">
                    {entry.actorName} {describe(entry)}
                  </p>
                  <p className="pt-[2px] font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                    {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
