'use client'

import { createContext, use, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Crown,
  MapPin,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import type { DefenseType, DefenseVerdict } from '@prisma/client'
import type {
  DefensePanelistPayload,
  DefenseSchedulePayload,
} from '@/lib/actions/defense'
import { getInitials } from '@/lib/helper'

interface DefenseDetailsDrawerProps {
  /** Selected schedule, or null when the drawer is closed. */
  schedule: DefenseSchedulePayload | null
  /** Session user id — determines whether footer actions are shown. */
  currentUserId: number
  onClose: () => void
  onEdit: (schedule: DefenseSchedulePayload) => void
  onDelete: (schedule: DefenseSchedulePayload) => void
}

interface DefenseDetailsContextValue {
  schedule: DefenseSchedulePayload | null
  isOwner: boolean
  onClose: () => void
  onEdit: (schedule: DefenseSchedulePayload) => void
  onDelete: (schedule: DefenseSchedulePayload) => void
}

// Shared context keeps the compound subcomponents free of prop drilling. The
// parent page controls open/close by passing `schedule` (null = closed).
const DefenseDetailsContext = createContext<DefenseDetailsContextValue | null>(
  null,
)

function useDefenseDetails() {
  const context = use(DefenseDetailsContext)
  if (!context) {
    throw new Error(
      'DefenseDetails subcomponents must be rendered within DefenseDetailsDrawer',
    )
  }
  return context
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DefenseType, string> = {
  PROPOSAL: 'Proposal Defense',
  FINAL: 'Final Defense',
}

// Verdict badge maps verdict → label/colors exactly like the table row
// (DefenseDataRow) so the drawer badge and the row badge always match.
const VERDICT_META: Record<DefenseVerdict, { label: string; className: string }> =
  {
    PENDING: {
      label: 'No Verdict',
      className: '',
    },
    APPROVED: {
      label: 'Approved',
      className:
        'bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[#22c55e]',
    },
    MINOR_REVISION: {
      label: 'Minor Revisions',
      className:
        'bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.25)] text-[#3b82f6]',
    },
    MAJOR_REVISION: {
      label: 'Major Revisions',
      className:
        'bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.25)] text-[#f97316]',
    },
    REJECTED: {
      label: 'Rejected',
      className:
        'bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.25)] text-[#f43f5e]',
    },
  }

// Same avatar palette as the faculty drawer so faces stay consistent app-wide.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #fe6f6f, #e85555)',
  'linear-gradient(135deg, #f59e0b, #e08800)',
  'linear-gradient(135deg, #22c55e, #16a34a)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #707dff, #5565ff)',
]

// Panelist ids are stable, so the same person always gets the same gradient.
function gradientFor(userId: number): string {
  return AVATAR_GRADIENTS[userId % AVATAR_GRADIENTS.length]
}

// Verdict badge mirrors the table's badge (subtask 05) for visual continuity.
function verdictClassName(verdict: DefenseVerdict): string {
  return VERDICT_META[verdict].className
}

function verdictLabel(verdict: DefenseVerdict): string {
  return VERDICT_META[verdict].label
}

// Schedules store a date-only value at UTC midnight, so format in UTC too —
// otherwise the displayed day can shift in non-UTC timezones (matches
// DefenseDataRow's formatter).
function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Normalizes the wizard's time strings ("09:00", "9:00 AM", "9 AM") into the
// "9:00 AM" display format. Mirrors DefenseDataRow's formatter so the drawer
// time and the table time read identically.
function formatTime(value: string): string {
  const trimmed = value.trim()

  const explicit = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/)
  if (explicit) {
    return `${parseInt(explicit[1], 10)}:${explicit[2]} ${explicit[3].toUpperCase()}`
  }

  const hourOnly = trimmed.match(/^(\d{1,2})\s*(AM|PM|am|pm)$/)
  if (hourOnly) {
    return `${parseInt(hourOnly[1], 10)}:00 ${hourOnly[2].toUpperCase()}`
  }

  const military = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (military) {
    const hour = parseInt(military[1], 10)
    const minutes = military[2]
    if (hour === 0 || hour === 24) return `12:${minutes} AM`
    if (hour < 12) return `${hour}:${minutes} AM`
    if (hour === 12) return `12:${minutes} PM`
    return `${hour - 12}:${minutes} PM`
  }

  return value
}

// ── Presentational pieces ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-3">
      {children}
    </p>
  )
}

function VerdictBadge({ verdict }: { verdict: DefenseVerdict }) {
  if (verdict === 'PENDING') {
    return (
      <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
        {verdictLabel(verdict)}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] leading-[15.75px] whitespace-nowrap ${verdictClassName(verdict)}`}
    >
      {verdictLabel(verdict)}
    </span>
  )
}

function DefenseTypePill({ type }: { type: DefenseType }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.16)] px-[10px] py-[3px] text-[11px] font-bold leading-[16px] text-[#707dff] whitespace-nowrap">
      {TYPE_LABELS[type]}
    </span>
  )
}

function GroupInfoCard() {
  const { schedule } = useDefenseDetails()
  if (!schedule) return null

  return (
    <div className="flex flex-col gap-[10px] bg-[#fafbff] border border-[#e8ebf8] rounded-xl p-4">
      <div className="flex items-start justify-between gap-[12px]">
        <div className="min-w-0 flex flex-col gap-[2px]">
          <p className="truncate font-heading font-bold text-[16px] leading-[24px] text-[#10133a]">
            {schedule.groupName}
          </p>
          <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
            {schedule.sectionName}
          </p>
        </div>
        <VerdictBadge verdict={schedule.verdict} />
      </div>
      <DefenseTypePill type={schedule.type} />
    </div>
  )
}

function ScheduleRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="size-[30px] rounded-lg bg-[rgba(112,125,255,0.05)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#a0abcc]">
          {label}
        </span>
        <span className="truncate font-sans font-semibold text-[13px] leading-[19.5px] text-[#1e2145]">
          {value}
        </span>
      </div>
    </div>
  )
}

function ScheduleSection() {
  const { schedule } = useDefenseDetails()
  if (!schedule) return null

  const rows = [
    {
      key: 'date',
      icon: <Calendar className="size-[14px] text-[#707dff]" strokeWidth={2} />,
      label: 'Date',
      value: formatDate(schedule.date),
    },
    {
      key: 'time',
      icon: <Clock className="size-[14px] text-[#707dff]" strokeWidth={2} />,
      label: 'Time',
      value: `${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`,
    },
    {
      key: 'venue',
      icon: <MapPin className="size-[14px] text-[#707dff]" strokeWidth={2} />,
      label: 'Venue',
      value: schedule.venue,
    },
  ]

  return (
    <div className="flex flex-col gap-[10px]">
      <SectionLabel>Schedule</SectionLabel>
      <div className="border border-[#e8ebf8] rounded-[10px] divide-y divide-[#f0f2fa]">
        {rows.map((row) => (
          <ScheduleRow
            key={row.key}
            icon={row.icon}
            label={row.label}
            value={row.value}
          />
        ))}
      </div>
    </div>
  )
}

function PanelistBadge({
  role,
  memberIndex,
}: {
  role: DefensePanelistPayload['role']
  memberIndex?: number
}) {
  if (role === 'CHAIR') {
    return (
      <span className="inline-flex items-center gap-[4px] rounded-full bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] px-[8px] py-[2px] text-[10.5px] font-bold leading-[15.75px] text-[#f59e0b] whitespace-nowrap">
        <Crown className="size-[10px]" strokeWidth={2.5} />
        Chair
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#f4f6ff] border border-[#e5e8ff] px-[8px] py-[2px] text-[10.5px] font-bold leading-[15.75px] text-[#707dff] whitespace-nowrap">
      Member {memberIndex ?? 1}
    </span>
  )
}

function PanelistCard({
  panelist,
  memberIndex,
}: {
  panelist: DefensePanelistPayload
  memberIndex?: number
}) {
  return (
    <div className="flex items-center gap-3 bg-[#fafbff] border border-[#e8ebf8] rounded-lg px-3 py-2.5">
      <div
        className="size-[28px] rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundImage: gradientFor(panelist.userId) }}
      >
        <span className="font-sans font-bold text-[10.5px] text-white">
          {getInitials(panelist.name)}
        </span>
      </div>
      <p className="min-w-0 flex-1 truncate font-sans font-semibold text-[13px] leading-[19.5px] text-[#1e2145]">
        {panelist.name}
      </p>
      <PanelistBadge role={panelist.role} memberIndex={memberIndex} />
    </div>
  )
}

function PanelistsSection() {
  const { schedule } = useDefenseDetails()
  if (!schedule) return null

  // Business rule: exactly one CHAIR + two PANEL_MEMBERs. Chair always renders
  // first; member ordinal comes from their order in the schedule's panel.
  const chair = schedule.panelists.find((p) => p.role === 'CHAIR')
  const members = schedule.panelists.filter((p) => p.role === 'PANEL_MEMBER')

  return (
    <div className="flex flex-col gap-[10px]">
      <SectionLabel>Panelists</SectionLabel>
      <div className="flex flex-col gap-2">
        {chair && <PanelistCard panelist={chair} />}
        {members.map((panelist, index) => (
          <PanelistCard
            key={panelist.userId}
            panelist={panelist}
            memberIndex={index + 1}
          />
        ))}
      </div>
    </div>
  )
}

function DefenseDetailsHeader() {
  const { onClose } = useDefenseDetails()
  return (
    <div className="flex self-stretch items-center justify-between gap-[12px] px-[22px] py-4 border-b border-[#f0f2fa] shrink-0">
      <h2 className="font-heading font-bold text-[14px] leading-[21px] text-[#10133a]">
        Defense Details
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close defense details"
        className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
      >
        <X className="size-[13px] text-[#8a93b4]" />
      </button>
    </div>
  )
}

// Only shown for schedules created by the current user (ownership rule).
function DefenseDetailsFooter() {
  const { schedule, isOwner, onEdit, onDelete } = useDefenseDetails()
  if (!schedule || !isOwner) return null

  return (
    <div className="flex items-center gap-2.5 border-t border-[#f0f2fa] px-5 py-3.5 shrink-0">
      <button
        type="button"
        onClick={() => onDelete(schedule)}
        className="flex flex-1 items-center justify-center gap-2 h-10 rounded-[10px] bg-red-50 border border-red-200 text-[13px] font-bold text-red-500 hover:bg-red-100 transition-colors"
      >
        <Trash2 className="size-4" strokeWidth={2.25} />
        Delete
      </button>
      <button
        type="button"
        onClick={() => onEdit(schedule)}
        className="flex flex-1 items-center justify-center gap-2 h-10 rounded-[10px] bg-[#707dff] text-[13px] font-bold text-white hover:bg-[#5565ff] transition-colors"
      >
        <Pencil className="size-4" strokeWidth={2.25} />
        Edit Schedule
      </button>
    </div>
  )
}

// ── Drawer root ──────────────────────────────────────────────────────────────

export function DefenseDetailsDrawer({
  schedule,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
}: DefenseDetailsDrawerProps) {
  // Namespace-safe comparison: session ids can arrive as strings while the
  // payload id is a number — coerce both sides (same rule as DefenseDataRow).
  const isOwner =
    schedule != null && Number(schedule.createdById) === Number(currentUserId)
  const isOpen = schedule != null

  // Escape closes; body scroll locks while the drawer is open (matches the
  // existing faculty/evaluation drawers).
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <DefenseDetailsContext
      value={{ schedule, isOwner, onClose, onEdit, onDelete }}
    >
      <div
        className={`fixed inset-0 z-40 bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Defense details"
        className={`fixed top-0 right-0 h-dvh w-[420px] max-w-full z-50 bg-white border-l border-[#eceef8] shadow-[-8px_0px_40px_rgba(112,125,255,0.14)] transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <DefenseDetailsHeader />
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {schedule && (
            <div className="flex flex-col gap-[22px]">
              <GroupInfoCard />
              <ScheduleSection />
              <PanelistsSection />
            </div>
          )}
        </div>
        <DefenseDetailsFooter />
      </div>
    </DefenseDetailsContext>
  )
}
