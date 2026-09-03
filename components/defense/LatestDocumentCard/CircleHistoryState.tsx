/**
 * Circle history state — 15px status dot (Figma 1448-7156, reused for 1471-6082).
 * Shared between DefenseDocumentCard and LatestDocumentCard.
 */

const CIRCLE_STYLES: Record<string, string> = {
  NO_VERDICT: 'bg-[#e0e3f0] border-[#cdd3ea] rounded-[25px]',
  PENDING: 'bg-[#e0e3f0] border-[#cdd3ea] rounded-[25px]',
  APPROVED: 'bg-[#16a34a] border-[#cfebd6] rounded-[25px]',
  MINOR_REVISION: 'bg-[#f59e0b] border-[#f2ddba] rounded-[50px]',
  MAJOR_REVISION: 'bg-[#e1681d] border-[#ffd1b4] rounded-[50px]',
  REJECTED: 'bg-[#e11d48] border-[#efd5da] rounded-[25px]',
  IN_REVIEW: 'bg-[#f59e0b] border-[#f2ddba] rounded-[50px]',
}

type CircleHistoryStateProps = {
  state: string
}

/**
 * 15px circle dot indicating document verdict/review state.
 * PENDING / NO_VERDICT → gray #e0e3f0; per-status colors otherwise.
 */
export function CircleHistoryState({ state }: CircleHistoryStateProps) {
  const normalized = state === 'PENDING' ? 'NO_VERDICT' : state
  return (
    <span
      aria-hidden="true"
      className={`size-[15px] border-2 border-solid shrink-0 ${CIRCLE_STYLES[normalized] ?? CIRCLE_STYLES.NO_VERDICT}`}
    />
  )
}

export { CIRCLE_STYLES }
