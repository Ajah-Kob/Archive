'use client'

import { Activity, Check, Copy, FileUp, Flag, Layers, PenLine, Shield, UserPlus, Users } from 'lucide-react'
import { formatDateTime } from '@/lib/helper'
import { getSectionActivityFeed, type SectionActivityEntry } from '@/lib/actions/section-activity'

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

function val(source: unknown, ...keys: string[]): string | null {
  if (source == null) return null
  if (typeof source === 'string') return source || null
  if (typeof source !== 'object') return null
  for (const k of keys) {
    const v = (source as Record<string, unknown>)[k]
    if (typeof v === 'string' && v) return v
  }
  return null
}

// Raw status codes never reach the reader — every outcome has a plain verb.
function words(code: string | null): string {
  if (!code) return 'reviewed'
  const map: Record<string, string> = {
    APPROVED: 'approved',
    NEED_REVISION: 'requested revisions on',
    MINOR_REVISION: 'approved with minor revisions',
    MAJOR_REVISION: 'approved with major revisions',
    REDEFENSE: 'ordered a redefense for',
    PENDING: 'is pending for',
  }
  return map[code] ?? code.replace(/_/g, ' ').toLowerCase()
}

function titleCase(code: string): string {
  return code
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

function openWord(after: unknown): string {
  if (after && typeof after === 'object' && 'open' in after) {
    return (after as { open?: unknown }).open ? 'unlocked' : 'locked'
  }
  return 'updated'
}

function defenseWhen(after: unknown): string {
  const date = val(after, 'date')
  const venue = val(after, 'venue')
  const when = date ? formatDateTime(date) : null
  if (when && venue) return ` on ${when} at ${venue}`
  if (when) return ` on ${when}`
  if (venue) return ` at ${venue}`
  return ''
}

function defenseKind(after: unknown): string {
  const type = val(after, 'type')
  if (!type) return 'defense'
  return `${type.charAt(0) + type.slice(1).toLowerCase()} defense`
}

function describe(entry: SectionActivityEntry): string {
  const name = entry.entityName ?? entry.entity
  switch (entry.action) {
    case 'GROUP_CREATE': return `created group ${name}`
    case 'GROUP_RENAME': {
      const from = val(entry.before, 'groupName', 'name') ?? 'a group'
      const to = val(entry.after, 'groupName', 'name') ?? name
      return `renamed group ${from} to ${to}`
    }
    case 'GROUP_JOIN': return `${name} joined the section`
    case 'GROUP_LEAVE': return `${name} left the group`
    case 'GROUP_REMOVE_MEMBER': return `${name} was removed from the group`
    case 'GROUP_TRANSFER': return `transferred leadership to ${name}`
    case 'GROUP_INVITE_SEND': return `invited ${name} to the group`
    case 'GROUP_INVITE_CANCEL': return `cancelled the group invitation to ${name}`
    case 'ADVISER_INVITE_SEND': return `invited ${name} as adviser`
    case 'ADVISER_INVITE_CANCEL': return `cancelled the adviser invitation to ${name}`
    case 'ADVISER_ASSIGNED': return `${name} accepted the adviser role`
    case 'SECTION_CREATE': return `created section ${name}`
    case 'SECTION_UPDATE': return `updated section ${name}`
    case 'SECTION_ARCHIVE': return `archived section ${name}`
    case 'SECTION_COORDINATOR_ASSIGN': return `assigned ${name} as coordinator`
    case 'SECTION_COORDINATOR_REASSIGN': return `reassigned coordination to ${name}`
    case 'SECTION_JOIN_CODE_REGENERATE': return 'regenerated the section join code'
    case 'STUDENT_REMOVE_SECTION': return `removed ${name} from the section`
    case 'MILESTONE_AVAILABILITY_SET': return `${openWord(entry.after)} milestone ${name}`
    case 'PHASE_AVAILABILITY_SET': return `${openWord(entry.after)} phase ${name}`
    case 'CHAPTER_SUBMIT': {
      const file = val(entry.after, 'fileName')
      return `submitted ${name}${file ? ` (${file})` : ''} for review`
    }
    case 'CHAPTER_RESUBMIT': {
      const file = val(entry.after, 'fileName')
      return `resubmitted ${name}${file ? ` (${file})` : ''} for review`
    }
    case 'CHAPTER_REVIEW': return `${words(val(entry.after, 'status'))} ${name}`
    case 'DEFENSE_SCHEDULE_CREATE': return `scheduled the ${defenseKind(entry.after)} for ${name}${defenseWhen(entry.after)}`
    case 'DEFENSE_SCHEDULE_UPDATE': return `updated the ${defenseKind(entry.after)} schedule for ${name}${defenseWhen(entry.after)}`
    case 'DEFENSE_RESCHEDULE': return `rescheduled the ${defenseKind(entry.after)} for ${name}${defenseWhen(entry.after)}`
    case 'DEFENSE_VERDICT': return `gave the verdict for ${name}: ${words(val(entry.after, 'verdict'))}`
    case 'DEFENSE_DOCUMENT_SUBMIT': return `submitted ${name} for the defense`
    case 'DEFENSE_DOCUMENT_RESUBMIT': return `resubmitted ${name} for the defense`
    case 'DEFENSE_DOCUMENT_REPLACE': return `replaced ${name} for the defense`
    case 'DEFENSE_RESUBMISSION_REVIEW': return `reviewed the resubmission for ${name} — ${words(val(entry.after, 'status'))}`
    case 'ARCHIVING_SUBMIT': return `submitted ${name} for archiving`
    case 'ARCHIVING_APPROVE': return `approved ${name} for the repository`
    case 'TOPIC_SAVE': {
      const title = val(entry.after, 'title') ?? name
      return `set the topic of ${name} to “${title}”`
    }
    case 'FACULTY_JOIN': return `${name} joined as faculty`
    case 'FACULTY_REMOVE': return `${name} left the faculty`
    default: return `${titleCase(entry.action)} — ${name}`
  }
}

/**
 * Section activity feed — read-only timeline of what has happened in this
 * section. Mirrors the resubmission feed's visual language (icon tile, rail,
 * actor + description + timestamp) but scoped to the section.
 *
 * Entries are fetched server-side by the page and passed in — no client-side
 * action call.
 */
export function SectionActivityFeed({ entries }: { entries: SectionActivityEntry[] | null }) {
  if (entries === null) {
    return (
      <div className="rounded-[14px] border border-[#eceef8] bg-white p-5 shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
        <h2 className="font-['Sora',sans-serif] font-bold text-[13.5px] text-[#1e3a8a]">Activity</h2>
        <p className="mt-2 font-sans text-[12.5px] text-[#8a93b4]">
          Could not load activity. Please try again.
        </p>
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
        <ol className="mt-3 flex flex-col max-h-[560px] overflow-y-auto">
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
