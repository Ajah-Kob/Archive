'use client'

import { Check, Clock, FileText, MessageSquareText, TriangleAlert } from 'lucide-react'
import {
  PANELIST_VERDICT_VARIANTS,
  resolvePanelistVisualState,
  type PanelistVerdictState,
} from './verdict-callout-variants'

// ── Types ────────────────────────────────────────────────────────────────────

export type VerdictCalloutState =
  | 'NO_DOCUMENT'
  | 'WAITING_FOR_SCHEDULE'
  | 'APPROVED'
  | 'MINOR_REVISION'
  | 'MAJOR_REVISION'
  | 'REJECTED'

interface VerdictCalloutProps {
  state: VerdictCalloutState
}

export type PanelistVerdictCalloutProps = {
  /** Explicit variant — 5 values; awaiting splits via isChair (Figma 1428-12746) */
  state: PanelistVerdictState
  isChair: boolean
}

// Shared shape used by both student and panelist variants — keeps
// colors, radii, icon-tile, headline, context and button styles role-agnostic.
type CalloutMeta = {
  Icon: typeof FileText
  boxClass: string
  iconTileClass: string
  headlineClass: string
  headline: string
  context: string
  button?: { backgroundImage: string; shadow: string }
}

// ── State metadata (student milestone — Figma 1412-6143) ─────────────────────

/**
 * Per-state styling for the student verdict callout (Figma 1412-6143).
 * Each state has its own accent color for the box, icon tile, headline, and
 * (where applicable) the "Review feedback" button gradient.
 */
const STATES: Record<VerdictCalloutState, CalloutMeta> = {
  NO_DOCUMENT: {
    Icon: FileText,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'No Document Uploaded',
    context: 'Upload your document before the defense schedule',
  },
  WAITING_FOR_SCHEDULE: {
    Icon: Clock,
    boxClass: 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.2)]',
    iconTileClass: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
    headlineClass: 'text-[#707dff]',
    headline: 'Waiting for Schedule & Verdict',
    context: 'Wait for your schedule. Verdict will be posted once submitted by the panel.',
  },
  APPROVED: {
    Icon: Check,
    boxClass: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)]',
    iconTileClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
    headlineClass: 'text-[#16a34a]',
    headline: 'Approved',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage: 'linear-gradient(103.38deg, rgb(22, 163, 74) 0%, rgb(18, 140, 63) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(22,163,74,0.22)]',
    },
  },
  MINOR_REVISION: {
    Icon: Clock,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'Minor Revision',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage: 'linear-gradient(104.12deg, rgb(245, 158, 11) 5.11%, rgb(218, 140, 7) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(245,158,11,0.22)]',
    },
  },
  MAJOR_REVISION: {
    Icon: TriangleAlert,
    boxClass: 'bg-[rgba(225,104,29,0.07)] border-[rgba(225,104,29,0.2)]',
    iconTileClass: 'bg-[rgba(225,104,29,0.08)] border-[rgba(225,104,29,0.19)]',
    headlineClass: 'text-[#e1681d]',
    headline: 'Major Revision',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage: 'linear-gradient(103.38deg, rgb(225, 104, 29) 0%, rgb(184, 82, 19) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(225,104,29,0.22)]',
    },
  },
  REJECTED: {
    Icon: TriangleAlert,
    boxClass: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)]',
    iconTileClass: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
    headlineClass: 'text-[#e11d48]',
    headline: 'Rejected',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage: 'linear-gradient(115.15deg, rgb(225, 29, 72) 44.98%, rgb(200, 26, 64) 99.87%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(225,29,72,0.22)]',
    },
  },
}

// ── Shared primitive (role-agnostic) ─────────────────────────────────────────

/**
 * Role-agnostic callout shell — Figma 1412-6143 / 1428-12746.
 * Outer: rounded 14px, border, responsive padding (compact on mobile, spacious on desktop).
 * Icon tile: 40px, rounded 12px, centered icon 20px.
 * Headline: Sora 15px bold, tracking -0.15px.
 * Context: 13px / 19.5px, color #5a6382.
 * Button: gradient + shadow per verdict where applicable.
 * Responsive: stacks vertically on mobile (full-width button), row on sm+.
 */
function CalloutShell({ meta }: { meta: CalloutMeta }) {
  const Icon = meta.Icon
  return (
    <section
      aria-live="polite"
      className={`flex flex-col gap-[12px] sm:flex-row sm:items-center sm:gap-[16px] rounded-[14px] border px-[18px] py-[16px] sm:px-[22px] sm:py-[18px] ${meta.boxClass}`}
    >
      <div className="flex items-center gap-[12px] sm:gap-[16px] min-w-0 flex-1">
        <div
          className={`flex size-[40px] items-center justify-center rounded-[12px] border shrink-0 ${meta.iconTileClass}`}
        >
          <Icon className={`size-[20px] ${meta.headlineClass}`} strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className={`font-sora text-[15px] font-bold tracking-[-0.15px] ${meta.headlineClass}`}>
            {meta.headline}
          </h2>
          <p className="pt-[3px] font-sans font-medium text-[13px] leading-[19.5px] text-[#5a6382]">
            {meta.context}
          </p>
        </div>
      </div>

      {meta.button ? (
        <button
          type="button"
          className={`flex w-full sm:w-auto shrink-0 items-center justify-center gap-[7px] rounded-[9px] border px-[18px] py-[9px] font-sans font-bold text-[12.5px] leading-[18.75px] text-white transition-opacity hover:opacity-95 ${meta.button.shadow}`}
          style={{
            backgroundImage: meta.button.backgroundImage,
            borderColor: 'rgba(255,255,255,0.4)',
          }}
        >
          <MessageSquareText className="size-[13px]" strokeWidth={2} />
          Review feedback
        </button>
      ) : null}
    </section>
  )
}

// ── Student component (unchanged public API) ─────────────────────────────────

/**
 * Verdict callout for the student defense milestone (Figma 1412-6143).
 *
 * Renders a colored status banner with an icon tile, headline, context line,
 * and — for verdict states (Approved / Minor / Major / Rejected) — a
 * "Review feedback" button. The button is a no-op placeholder for now since
 * the PDF review workspace is a separate task.
 */
export function VerdictCallout({ state }: VerdictCalloutProps) {
  const meta = STATES[state]
  return <CalloutShell meta={meta} />
}

// ── Panelist component (6 explicit states — Figma 1428-12746) ─────────────────

/**
 * Panelist Verdict Callout — 6 explicit visual states (Figma 1428-12746).
 *
 * Explicit variant API: `state` is the verdict (`'awaiting-verdict'` | 'approved' |
 * 'minor-revision' | 'major-revision' | 'rejected') plus `isChair` boolean.
 * The awaiting state splits into two visual copies:
 * - isChair true  → "You are the Panel Chair — submit the final verdict once all panel feedback is complete."
 * - isChair false → "Waiting for the Panel Chair to submit the final verdict."
 * The 4 verdict states reuse the student palette and share the same shell
 * (14px radius, 40px/12px icon tile, Sora 15px bold headline, 13px context,
 * gradient+shadow button where applicable) via CalloutShell.
 * No boolean soup — callers pass one `state` and one `isChair`.
 */
export function PanelistVerdictCallout({ state, isChair }: PanelistVerdictCalloutProps) {
  const visual = resolvePanelistVisualState(state, isChair)
  const meta = PANELIST_VERDICT_VARIANTS[visual]
  return <CalloutShell meta={meta} />
}

// Backwards-compat alias for callers that already imported the panelist shape.
export const DefensePanelistVerdictCallout = PanelistVerdictCallout
