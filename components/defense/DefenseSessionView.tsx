'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Crown,
  FileText,
  History,
  MapPin,
  Shield,
} from 'lucide-react'
import type { DefenseType, DefenseVerdict } from '@prisma/client'
import type { DefenseSessionPayload } from '@/lib/actions/defense'
import { getInitials } from '@/lib/helper'

// ── Pure helpers (mirror DefenseDetailsDrawer / DefenseCard) ─────────────────

const TYPE_LABELS: Record<DefenseType, string> = {
  PROPOSAL: 'Proposal Defense',
  FINAL: 'Final Defense',
}

const VERDICT_META: Record<DefenseVerdict, { label: string; className: string }> =
  {
    PENDING: { label: 'No Verdict', className: '' },
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

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #fe6f6f, #e85555)',
  'linear-gradient(135deg, #f59e0b, #e08800)',
  'linear-gradient(135deg, #22c55e, #16a34a)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #707dff, #5565ff)',
]

function gradientFor(userId: number): string {
  return AVATAR_GRADIENTS[userId % AVATAR_GRADIENTS.length]
}

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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Presentational pieces ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-3">
      {children}
    </p>
  )
}

function DefenseTypeBadge({ type }: { type: DefenseType }) {
  const isFinal = type === 'FINAL'
  return (
    <div
      className={`flex items-center justify-center gap-[6px] min-w-[148px] px-[11px] py-[5px] rounded-[8px] border border-solid shrink-0 ${
        isFinal
          ? 'bg-[rgba(254,111,111,0.07)] border-[rgba(254,111,111,0.18)]'
          : 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.18)]'
      }`}
    >
      <Shield
        className={`size-[9px] ${isFinal ? 'text-[#fe6f6f]' : 'text-[#707dff]'}`}
        strokeWidth={2}
      />
      <p
        className={`font-sans font-bold text-[11.5px] leading-[17.25px] whitespace-nowrap ${
          isFinal ? 'text-[#fe6f6f]' : 'text-[#707dff]'
        }`}
      >
        {TYPE_LABELS[type]}
      </p>
    </div>
  )
}

function VerdictBadge({ verdict }: { verdict: DefenseVerdict }) {
  if (verdict === 'PENDING') {
    return (
      <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
        {VERDICT_META[verdict].label}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] leading-[15.75px] whitespace-nowrap ${VERDICT_META[verdict].className}`}
    >
      {VERDICT_META[verdict].label}
    </span>
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

function PanelistBadge({
  role,
  memberIndex,
}: {
  role: DefenseSessionPayload['panelists'][number]['role']
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
  panelist: DefenseSessionPayload['panelists'][number]
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

// ── Document / history pieces ────────────────────────────────────────────────

function ReviewStatus({ status }: { status: 'PENDING' | 'APPROVED' }) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-[4px] rounded-full bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] px-[8px] py-[2px] text-[10.5px] font-bold leading-[15.75px] text-[#22c55e] whitespace-nowrap">
        <Check className="size-[10px]" strokeWidth={2.5} />
        Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#f4f6ff] border border-[#e5e8ff] px-[8px] py-[2px] text-[10.5px] font-bold leading-[15.75px] text-[#707dff] whitespace-nowrap">
      Pending
    </span>
  )
}

// ── Root view ────────────────────────────────────────────────────────────────

interface DefenseSessionViewProps {
  session: DefenseSessionPayload
  /** When true, the inner back button is hidden (the ContextBar owns it). */
  hideBack?: boolean
}

/**
 * Read-only Defense Session workspace. Shows the defense details, panel roster,
 * the latest submitted document, and the full submission history. The Chair
 * verdict submission and the annotation workspace are built in later increments.
 */
export function DefenseSessionView({
  session,
  hideBack = false,
}: DefenseSessionViewProps) {
  const router = useRouter()

  const chair = session.panelists.find((p) => p.role === 'CHAIR')
  const members = session.panelists.filter((p) => p.role === 'PANEL_MEMBER')

  // Latest document = the most recent resubmission, or the initial document
  // (version 1) when no resubmission exists yet.
  const latest =
    session.resubmissions.length > 0
      ? session.resubmissions[session.resubmissions.length - 1]
      : null

  const scheduleRows = [
    {
      key: 'date',
      icon: <Calendar className="size-[14px] text-[#707dff]" strokeWidth={2} />,
      label: 'Date',
      value: formatDate(session.date),
    },
    {
      key: 'time',
      icon: <Clock className="size-[14px] text-[#707dff]" strokeWidth={2} />,
      label: 'Time',
      value: `${formatTime(session.startTime)} – ${formatTime(session.endTime)}`,
    },
    {
      key: 'venue',
      icon: <MapPin className="size-[14px] text-[#707dff]" strokeWidth={2} />,
      label: 'Venue',
      value: session.venue,
    },
  ]

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Title row — back button lives in DefenseSessionContextBar when hideBack */}
      <div className="flex items-center gap-[12px]">
        {!hideBack && (
          <button
            type="button"
            onClick={() => router.push('/faculty/defense')}
            aria-label="Back to defense"
            className="bg-white border border-[#eceef8] rounded-[14px] size-[32px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
          >
            <ArrowLeft className="size-[15px] text-[#8a93b4]" />
          </button>
        )}
        <div className="flex items-center gap-[12px] min-w-0">
          <DefenseTypeBadge type={session.type} />
          <div className="min-w-0">
            <h2 className="truncate font-heading font-bold text-[16px] leading-[24px] text-[#10133a]">
              {session.groupName}
            </h2>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
              {session.sectionName}
            </p>
          </div>
          <VerdictBadge verdict={session.verdict} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-[16px] items-start">
        {/* Left column: schedule + panel */}
        <div className="flex flex-col gap-[16px]">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] p-5">
            <SectionLabel>Schedule</SectionLabel>
            <div className="border border-[#e8ebf8] rounded-[10px] divide-y divide-[#f0f2fa]">
              {scheduleRows.map((row) => (
                <ScheduleRow
                  key={row.key}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                />
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] p-5">
            <SectionLabel>Panel</SectionLabel>
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
        </div>

        {/* Right column: latest document + submission history */}
        <div className="flex flex-col gap-[16px] min-w-0">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] p-5">
            <SectionLabel>Defense Document</SectionLabel>
            {latest ? (
              <div className="flex items-center gap-3 bg-[#fafbff] border border-[#e8ebf8] rounded-lg px-4 py-3">
                <div className="size-[36px] rounded-lg bg-[rgba(112,125,255,0.08)] flex items-center justify-center shrink-0">
                  <FileText className="size-[16px] text-[#707dff]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans font-semibold text-[13px] leading-[19.5px] text-[#1e2145]">
                    {latest.fileName}
                  </p>
                  <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                    Version {latest.version} · {formatSize(latest.size)} ·{' '}
                    {formatDate(latest.dateSubmitted)}
                  </p>
                </div>
                <a
                  href={latest.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-[5px] h-[28px] px-[11px] bg-[#707dff] rounded-[7px] font-sans font-semibold text-[11px] text-white hover:bg-[#5565ff] transition-colors shrink-0"
                >
                  <FileText className="size-[12px]" strokeWidth={2.25} />
                  Open Document
                </a>
              </div>
            ) : (
              <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
                No document has been submitted for this defense yet.
              </p>
            )}
          </div>

          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] p-5">
            <SectionLabel>Submission History</SectionLabel>
            {session.resubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
                  <History className="size-5 text-[#707dff]" strokeWidth={1.75} />
                </div>
                <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] max-w-[320px]">
                  No resubmissions yet. The initial document used during the
                  defense will appear here once submitted.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#f0f2fa]">
                {session.resubmissions.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <div className="size-[32px] rounded-lg bg-[rgba(112,125,255,0.05)] flex items-center justify-center shrink-0">
                      <FileText className="size-[14px] text-[#707dff]" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#1e2145]">
                        {r.fileName}
                      </p>
                      <p className="font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4]">
                        Version {r.version} · {formatDate(r.dateSubmitted)}
                      </p>
                    </div>
                    <div className="flex items-center gap-[6px] shrink-0">
                      {r.reviews.map((review) => (
                        <span
                          key={review.panelistId}
                          title={review.name}
                          className="inline-flex items-center gap-[4px]"
                        >
                          <span
                            className="size-[20px] rounded-full flex items-center justify-center"
                            style={{ backgroundImage: gradientFor(review.panelistId) }}
                          >
                            <span className="font-sans font-bold text-[8px] text-white">
                              {getInitials(review.name)}
                            </span>
                          </span>
                          <ReviewStatus status={review.status} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
