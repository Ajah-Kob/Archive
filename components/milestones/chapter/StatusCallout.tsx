'use client'

import { Check, Clock, FileText, TriangleAlert } from 'lucide-react'
import type { ChapterVersionItem, ChapterViewState } from '@/types/milestones'

interface StatusCalloutProps {
  state: ChapterViewState
  chapterLabel: string
  current?: ChapterVersionItem | null
  onReviewFeedback?: () => void
}

function formatReviewedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATES: Record<
  ChapterViewState,
  {
    Icon: typeof FileText
    boxClass: string
    iconClass: string
    headline: (chapterLabel: string) => string
    context: (current: ChapterVersionItem | null) => string
  }
> = {
  DEFAULT: {
    Icon: FileText,
    boxClass: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
    iconClass: 'text-[#707dff]',
    headline: () => 'Submit your document',
    context: () => 'Upload your document for adviser review.',
  },
  IN_REVIEW: {
    Icon: Clock,
    boxClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    iconClass: 'text-[#f59e0b]',
    headline: () => 'In review',
    context: (current) =>
      current?.submittedAt
        ? `Awaiting adviser review since ${formatReviewedDate(current.submittedAt)}.`
        : 'Awaiting adviser review.',
  },
  NEEDS_REVISION: {
    Icon: TriangleAlert,
    boxClass: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
    iconClass: 'text-[#e11d48]',
    headline: () => 'Needs revision',
    context: (current) =>
      current?.reviewedAt
        ? `Reviewed ${formatReviewedDate(current.reviewedAt)}. Please review the feedback and resubmit.`
        : 'Please review the adviser feedback and resubmit.',
  },
  APPROVED: {
    Icon: Check,
    boxClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
    iconClass: 'text-[#16a34a]',
    headline: () => 'Approved',
    context: (current) =>
      current?.reviewedAt
        ? `Reviewed and accepted on ${formatReviewedDate(current.reviewedAt)}.`
        : 'Reviewed and accepted.',
  },
}

export function StatusCallout({
  state,
  chapterLabel,
  current,
  onReviewFeedback,
}: StatusCalloutProps) {
  const hero = STATES[state]
  const Icon = hero.Icon

  return (
    <section
      aria-live="polite"
      className={`flex items-center gap-[16px] rounded-[14px] border px-[22px] py-[18px] ${hero.boxClass}`}
    >
      <div
        className={`flex size-[40px] items-center justify-center rounded-[12px] border shrink-0 ${hero.boxClass}`}
      >
        <Icon className={`size-[20px] ${hero.iconClass}`} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={`font-sora text-[15px] font-semibold ${hero.iconClass}`}>
          {hero.headline(chapterLabel)}
        </h2>
        <p className="text-[13px] text-[#5a6382]">{hero.context(current)}</p>
      </div>
      {state === 'NEEDS_REVISION' && onReviewFeedback && (
        <button
          type="button"
          onClick={onReviewFeedback}
          className="shrink-0 rounded-[9px] border border-[rgba(225,29,72,0.4)] bg-[#e11d48] px-[18px] py-[9px] font-sora text-[13px] font-medium text-white shadow-[0px_2px_4px_rgba(225,29,72,0.2)] transition-all hover:bg-[#c91a40]"
        >
          Review feedback
        </button>
      )}
    </section>
  )
}