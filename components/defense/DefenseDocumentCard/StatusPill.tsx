/**
 * Status pill — Figma 1448-7141, reused for 1471-6082.
 * 7px radius, per-verdict colors, shown when verdict !== PENDING.
 */

const PILL_STYLES: Record<string, { label: string; className: string }> = {
  APPROVED: {
    label: 'Approved',
    className:
      'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
  },
  MINOR_REVISION: {
    label: 'Minor Revision',
    className:
      'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  },
  MAJOR_REVISION: {
    label: 'Major Revision',
    className:
      'bg-[rgba(225,104,29,0.07)] border-[rgba(225,104,29,0.2)] text-[#e1681d]',
  },
  REJECTED: {
    label: 'Rejected',
    className:
      'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)] text-[#e11d48]',
  },
  IN_REVIEW: {
    label: 'For Review',
    className:
      'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  },
}

type StatusPillProps = {
  state: string
}

/**
 * Colored pill for a document's verdict/review state.
 * Returns null for PENDING / unknown states (Figma shows only circle + amber line).
 * 7px radius per Figma 1471-6082.
 */
export function StatusPill({ state }: StatusPillProps) {
  const normalized = (state ?? '').toUpperCase().replace(/\s+/g, '_')
  if (normalized === 'PENDING' || normalized === 'NO_VERDICT') return null
  // FOR_REVIEW and IN_REVIEW share the same yellow "For Review" pill
  const key = normalized === 'FOR_REVIEW' ? 'IN_REVIEW' : normalized
  const meta = PILL_STYLES[key]
  if (!meta) return null
  return (
    <span
      className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] font-sans font-bold text-[11px] leading-[16.5px] whitespace-nowrap ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

export { PILL_STYLES }
