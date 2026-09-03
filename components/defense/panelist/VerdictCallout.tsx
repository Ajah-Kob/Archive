'use client'

/**
 * Panelist Verdict Callout wrapper — Figma 1428-12746.
 * Re-exports the panelist variant from the shared milestone primitives so
 * callers under `components/defense/panelist/*` can import from a domain-aligned path
 * while the source of truth remains `components/milestones/defense/VerdictCallout.tsx`.
 */
export {
  PanelistVerdictCallout,
  DefensePanelistVerdictCallout,
  type PanelistVerdictCalloutProps,
} from '@/components/milestones/defense/VerdictCallout'

export {
  PANELIST_VERDICT_VARIANTS,
  resolvePanelistVisualState,
  derivePanelistVisualState,
  type PanelistVerdictVisualState,
  type PanelistVerdictState,
  type CalloutVariantMeta,
} from '@/components/milestones/defense/verdict-callout-variants'
