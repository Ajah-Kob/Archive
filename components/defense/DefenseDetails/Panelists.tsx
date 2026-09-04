'use client'

import { Crown, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import type { DefenseVerdict, PanelistRole } from '@prisma/client'
import type { DefensePanelistPayload } from '@/lib/actions/defense'
import { getInitials } from '@/lib/helper'
import {
  UserProfile,
  PANELIST_AVATAR_GRADIENT,
} from '@/components/ui/UserProfile'
import { deriveFeedbackText as deriveFeedbackTextHelper } from '@/lib/defense/session-helpers'

// ── Me indicator ───────────────────────────────────────────────────────────

function MeBadge() {
  return (
    <span className="inline-flex items-center gap-[4px] rounded-full bg-[#eef2ff] border border-[#c7d2fe] px-[7px] py-[2px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[10px] leading-[14px] text-[#4f46e5] whitespace-nowrap shrink-0">
      Me
    </span>
  )
}

// ── Pills ────────────────────────────────────────────────────────────────────

function PanelPill({ role }: { role: PanelistRole }) {
  if (role === 'CHAIR') {
    return (
      <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.13)] px-[10px] py-[3px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#f59e0b] whitespace-nowrap shrink-0">
        <Crown className="size-[12px]" strokeWidth={2} />
        Panel Chair
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.13)] px-[10px] py-[3px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#707dff] whitespace-nowrap shrink-0">
      <User className="size-[12px]" strokeWidth={2} />
      Panel Member
    </span>
  )
}

// ── Feedback text (privacy-gated) ────────────────────────────────────────────
// Status only — never exposes another panelist's private comment content.
// Gate: PENDING never shows counts even when a feedback object is present.
// Delegates to session-helpers so the UI and lib share one gate definition.

function deriveFeedbackText(
  verdict: string,
  feedback: { comments: number; pages: number } | null | undefined,
): string {
  // Cast to DefenseVerdict for the shared helper; unknown verdicts fall back to PENDING gate.
  const v = (verdict as DefenseVerdict) ?? 'PENDING'
  return deriveFeedbackTextHelper(v, feedback)
}

// ── Row ──────────────────────────────────────────────────────────────────────

type PanelistRowProps = {
  panelist: DefensePanelistPayload
  verdict: string
  isFirst: boolean
  isLast: boolean
}

function PanelistRow({ panelist, verdict, isFirst, isLast }: PanelistRowProps) {
  const radius = isFirst
    ? 'rounded-tl-[10px] rounded-tr-[10px]'
    : isLast
      ? 'rounded-bl-[10px] rounded-br-[10px]'
      : ''
  const border = isLast
    ? 'border border-[#e8ebf8]'
    : 'border-l border-r border-t border-[#e8ebf8]'
  const feedback = (
    panelist as unknown as {
      feedback?: { comments: number; pages: number } | null
    }
  ).feedback
  const centerText = deriveFeedbackText(verdict, feedback)
  const { data: session } = useSession()
  const isMe = session?.user?.id != null && String(session.user.id) === String(panelist.userId)

  return (
    <div
      className={`bg-white ${border} ${radius} grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)] max-sm:grid-cols-1 max-sm:gap-2 items-center px-[17px] py-[6px] min-h-[61px] gap-2`}
    >
      {/* Col1: UserProfile avatar 35px gradient #1e3a8a→#2d52b8, name + email + Me */}
      <div className="flex items-center gap-2.5 min-w-0 sm:h-[50px] w-full">
        <UserProfile
          initials={getInitials(panelist.name)}
          name={panelist.name}
          email={panelist.email}
          gradient={PANELIST_AVATAR_GRADIENT}
          avatarClassName="size-[35px]"
        />
        {isMe ? <MeBadge /> : null}
      </div>
      {/* Col2 center: panelist→panelist status (Pending vs Finished) */}
      <div className="flex items-center justify-center sm:h-[50px] sm:px-2 min-w-0 w-full">
        <p
          className={`font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-center ${
            centerText.startsWith('✓') ? 'text-[#16a34a]' : 'text-[#9ea8c6]'
          }`}
        >
          {centerText}
        </p>
      </div>
      {/* Col3 right: pill Chair amber vs Member indigo */}
      <div className="flex items-center justify-end sm:h-[50px] shrink-0 w-full sm:w-auto">
        <PanelPill role={panelist.role} />
      </div>
    </div>
  )
}

function PanelistsEmpty() {
  return (
    <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
      No panelists have been assigned yet.
    </p>
  )
}

// ── Container ────────────────────────────────────────────────────────────────

type DefenseDetailsPanelistsProps = {
  panelists: DefensePanelistPayload[]
  verdict: string
}

export function DefenseDetailsPanelists({
  panelists,
  verdict,
}: DefenseDetailsPanelistsProps) {
  const chair = panelists.find((p) => p.role === 'CHAIR') ?? null
  const members = panelists.filter((p) => p.role === 'PANEL_MEMBER')
  const ordered = chair ? [chair, ...members] : members

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col gap-[10px] self-start w-full min-w-0">
        <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#9ea8c6]">
          Panelist
        </p>
        <PanelistsEmpty />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[10px] self-start w-full min-w-0">
      <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#9ea8c6]">
        Panelist
      </p>
      <div className="bg-white flex flex-col rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full overflow-clip">
        {ordered.map((panelist, index) => (
          <PanelistRow
            key={panelist.userId}
            panelist={panelist}
            verdict={verdict}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

// Panelist feedback completion checklist variant — Figma 1470:5094.
// Same grid/pill/privacy gate as Panelists; exposed as a named checklist
// so the panelist workspace can compose DefenseDetails.PanelistChecklist
// explicitly without branching on role.
export const DefenseDetailsPanelistChecklist = DefenseDetailsPanelists
export const DefenseDetailsPanelist = DefenseDetailsPanelists
export const PanelistChecklist = DefenseDetailsPanelists
