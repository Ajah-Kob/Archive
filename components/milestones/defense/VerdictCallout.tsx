'use client'

import { Check, Clock, FileText, MessageSquareText, TriangleAlert } from 'lucide-react'

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

// ── State metadata ───────────────────────────────────────────────────────────

/**
 * Per-state styling for the verdict callout (Figma 1412-6143).
 * Each state has its own accent color for the box, icon tile, headline, and
 * (where applicable) the "Review feedback" button gradient.
 */
const STATES: Record<
  VerdictCalloutState,
  {
    Icon: typeof FileText
    boxClass: string
    iconTileClass: string
    headlineClass: string
    headline: string
    context: string
    /** Gradient + shadow for the "Review feedback" button (verdict states only). */
    button?: { backgroundImage: string; shadow: string }
  }
> = {
  NO_DOCUMENT: {
    Icon: FileText,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass:
      'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'No Document Uploaded',
    context: 'Upload your document before the defense schedule',
  },
  WAITING_FOR_SCHEDULE: {
    Icon: Clock,
    boxClass: 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.2)]',
    iconTileClass:
      'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
    headlineClass: 'text-[#707dff]',
    headline: 'Waiting for Schedule & Verdict',
    context:
      'Wait for your schedule. Verdict will be posted once submitted by the panel.',
  },
  APPROVED: {
    Icon: Check,
    boxClass: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)]',
    iconTileClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
    headlineClass: 'text-[#16a34a]',
    headline: 'Approved',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage:
        'linear-gradient(103.38deg, rgb(22, 163, 74) 0%, rgb(18, 140, 63) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(22,163,74,0.22)]',
    },
  },
  MINOR_REVISION: {
    Icon: Clock,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass:
      'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'Minor Revision',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage:
        'linear-gradient(104.12deg, rgb(245, 158, 11) 5.11%, rgb(218, 140, 7) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(245,158,11,0.22)]',
    },
  },
  MAJOR_REVISION: {
    Icon: TriangleAlert,
    boxClass: 'bg-[rgba(225,104,29,0.07)] border-[rgba(225,104,29,0.2)]',
    iconTileClass:
      'bg-[rgba(225,104,29,0.08)] border-[rgba(225,104,29,0.19)]',
    headlineClass: 'text-[#e1681d]',
    headline: 'Major Revision',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage:
        'linear-gradient(103.38deg, rgb(225, 104, 29) 0%, rgb(184, 82, 19) 99.93%)',
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
      backgroundImage:
        'linear-gradient(115.15deg, rgb(225, 29, 72) 44.98%, rgb(200, 26, 64) 99.87%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(225,29,72,0.22)]',
    },
  },
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Verdict callout for the student defense milestone (Figma 1412-6143).
 *
 * Renders a colored status banner with an icon tile, headline, context line,
 * and — for verdict states (Approved / Minor / Major / Rejected) — a
 * "Review feedback" button. The button is a no-op placeholder for now since
 * the PDF review workspace is a separate task.
 */
export function VerdictCallout({ state }: VerdictCalloutProps) {
  const hero = STATES[state]
  const Icon = hero.Icon

  return (
    <section
      aria-live="polite"
      className={`flex items-center gap-[16px] rounded-[14px] border px-[22px] py-[18px] ${hero.boxClass}`}
    >
      <div
        className={`flex size-[40px] items-center justify-center rounded-[12px] border shrink-0 ${hero.iconTileClass}`}
      >
        <Icon className={`size-[20px] ${hero.headlineClass}`} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <h2
          className={`font-sora text-[15px] font-bold tracking-[-0.15px] ${hero.headlineClass}`}
        >
          {hero.headline}
        </h2>
        <p className="pt-[3px] font-sans font-medium text-[13px] leading-[19.5px] text-[#5a6382]">
          {hero.context}
        </p>
      </div>

      {hero.button && (
        <button
          type="button"
          className={`flex shrink-0 items-center gap-[7px] rounded-[9px] border px-[18px] py-[9px] font-sans font-bold text-[12.5px] leading-[18.75px] text-white transition-opacity hover:opacity-95 ${hero.button.shadow}`}
          style={{
            backgroundImage: hero.button.backgroundImage,
            borderColor: 'rgba(255,255,255,0.4)',
          }}
        >
          <MessageSquareText className="size-[13px]" strokeWidth={2} />
          Review feedback
        </button>
      )}
    </section>
  )
}
