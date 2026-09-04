// Panelist Verdict Callout variants — Figma 1428-12746 (6 explicit states).
// Awaiting split is chair vs non-chair; 4 verdicts reuse student palette.
// No DB, no side effects — pure metadata + helpers. Keep functions <50 lines.

import { Check, Clock, ShieldCheck, TriangleAlert } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * 6 explicit visual states for the panelist Verdict Callout.
 * - awaiting-chair: PENDING + isChair true
 * - awaiting-non-chair: PENDING + isChair false
 * - approved / minor_revision / major_revision / rejected: final verdicts
 */
export type PanelistVerdictVisualState =
  | 'awaiting-chair'
  | 'awaiting-non-chair'
  | 'approved'
  | 'minor_revision'
  | 'major_revision'
  | 'rejected'

/**
 * Explicit variant input for the panelist callout — avoids boolean soup.
 * The awaiting state is a single 'awaiting-verdict' value; isChair selects
 * which visual copy is rendered. Verdict states are identical regardless of role.
 * Dash variants are accepted for Figma parity and normalized to underscore.
 */
export type PanelistVerdictState =
  | 'awaiting-verdict'
  | 'awaiting_verdict'
  | 'awaiting-chair'
  | 'awaiting-non-chair'
  | 'approved'
  | 'minor_revision'
  | 'minor-revision'
  | 'major_revision'
  | 'major-revision'
  | 'rejected'

export interface CalloutVariantMeta {
  Icon: typeof Clock
  boxClass: string
  iconTileClass: string
  headlineClass: string
  headline: string
  context: string
  /** Gradient + shadow for callout action button. Verdict states use "Review feedback"; chair awaiting uses "Submit Verdict". */
  button?: {
    backgroundImage: string
    shadow: string
    label?: string
    icon?: typeof Clock
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeVerdictState(
  state: PanelistVerdictState,
): 'awaiting-verdict' | 'approved' | 'minor_revision' | 'major_revision' | 'rejected' | 'awaiting-chair' | 'awaiting-non-chair' {
  const s = state.replace(/-/g, '_')
  if (s === 'awaiting_verdict') return 'awaiting-verdict'
  if (s === 'awaiting_chair') return 'awaiting-chair'
  if (s === 'awaiting_non_chair') return 'awaiting-non-chair'
  if (s === 'minor_revision') return 'minor_revision'
  if (s === 'major_revision') return 'major_revision'
  return s as
    | 'approved'
    | 'rejected'
    | 'awaiting-verdict'
    | 'minor_revision'
    | 'major_revision'
    | 'awaiting-chair'
    | 'awaiting-non-chair'
}

/**
 * Maps an explicit `state` + `isChair` pair to one of the 6 visual states.
 * - 'awaiting-chair' / 'awaiting-non-chair' pass through directly (isChair ignored)
 * - 'awaiting-verdict' resolves via isChair
 * - verdict states pass through normalized (isChair ignored)
 */
export function resolvePanelistVisualState(
  state: PanelistVerdictState,
  isChair: boolean,
): PanelistVerdictVisualState {
  const n = normalizeVerdictState(state)
  if (n === 'awaiting-chair') return 'awaiting-chair'
  if (n === 'awaiting-non-chair') return 'awaiting-non-chair'
  if (n === 'awaiting-verdict') {
    return isChair ? 'awaiting-chair' : 'awaiting-non-chair'
  }
  // verdicts — already normalized
  return n as PanelistVerdictVisualState
}

// Aliases for session-helpers parity
export const derivePanelistVisualState = resolvePanelistVisualState

// ── State metadata (6 entries) ───────────────────────────────────────────────

/**
 * Per-state styling for the panelist verdict callout (Figma 1428-12746).
 * Awaiting states share the indigo palette; verdict states reuse the student
 * palette so colors stay role-agnostic. Icon tile 40px / 12px radius,
 * headline Sora 15px bold, context 13px, button gradient+shadow per verdict.
 */
export const PANELIST_VERDICT_VARIANTS: Record<
  PanelistVerdictVisualState,
  CalloutVariantMeta
> = {
  'awaiting-chair': {
    Icon: Clock,
    boxClass: 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.2)]',
    iconTileClass: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
    headlineClass: 'text-[#707dff]',
    headline: 'No Defense Verdict yet',
    context: 'Discuss the verdict with other members and submit your final verdict',
    button: {
      backgroundImage: 'linear-gradient(135deg, #707dff 0%, #5565ff 100%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(112,125,255,0.22)]',
      label: 'Submit Verdict',
      icon: ShieldCheck,
    },
  },
  'awaiting-non-chair': {
    Icon: Clock,
    boxClass: 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.2)]',
    iconTileClass: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
    headlineClass: 'text-[#707dff]',
    headline: 'No Defense Verdict yet',
    context: 'Discuss the verdict with other members and wait for final verdict',
  },
  approved: {
    Icon: Check,
    boxClass: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)]',
    iconTileClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
    headlineClass: 'text-[#16a34a]',
    headline: 'Approved',
    context: 'The document meets the defense requirements. No further revisions are needed.',
    button: {
      backgroundImage:
        'linear-gradient(103.38deg, rgb(22, 163, 74) 0%, rgb(18, 140, 63) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(22,163,74,0.22)]',
    },
  },
  minor_revision: {
    Icon: Clock,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'Minor Revision',
    context: 'Minor changes are required. Check submission history for latest resubmissions',
    button: {
      backgroundImage:
        'linear-gradient(104.12deg, rgb(245, 158, 11) 5.11%, rgb(218, 140, 7) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(245,158,11,0.22)]',
    },
  },
  major_revision: {
    Icon: TriangleAlert,
    boxClass: 'bg-[rgba(225,104,29,0.07)] border-[rgba(225,104,29,0.2)]',
    iconTileClass: 'bg-[rgba(225,104,29,0.08)] border-[rgba(225,104,29,0.19)]',
    headlineClass: 'text-[#e1681d]',
    headline: 'Major Revision',
    context: 'Significant revisions are required. Check submission history for latest resubmissions',
    button: {
      backgroundImage:
        'linear-gradient(103.38deg, rgb(225, 104, 29) 0%, rgb(184, 82, 19) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(225,104,29,0.22)]',
    },
  },
  rejected: {
    Icon: TriangleAlert,
    boxClass: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)]',
    iconTileClass: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
    headlineClass: 'text-[#e11d48]',
    headline: 'Rejected',
    context: 'Rejected. Check Submission History for the latest resubmission.',
    button: {
      backgroundImage:
        'linear-gradient(115.15deg, rgb(225, 29, 72) 44.98%, rgb(200, 26, 64) 99.87%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(225,29,72,0.22)]',
    },
  },
}
