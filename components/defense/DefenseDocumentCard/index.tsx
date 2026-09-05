import { LatestDocumentCardRoot } from './Root'
import { LatestDocumentCardHeader } from './Header'
import { LatestDocumentCardBody } from './Body'
import { LatestDocumentCardInitial } from './Initial'
import { LatestDocumentCardResubmitted } from './Resubmitted'
import { CircleHistoryState } from './CircleHistoryState'
import { StatusPill } from './StatusPill'
import { GhostButton } from './GhostButton'
import { StatusLine } from './StatusLine'

/**
 * DefenseDocumentCard — composition-first shared shell + Initial state
 * (Figma 1471-5962 shell, 1471-6082 initial). Resubmission branch (1471-6192)
 * will extend this via DefenseDocumentCard.Resubmitted.
 * Renamed from LatestDocumentCard — alias kept for backward compat.
 *
 * Usage:
 * <DefenseDocumentCard.Root>
 *   <DefenseDocumentCard.Header>Defense Document</DefenseDocumentCard.Header>
 *   <DefenseDocumentCard.Body>
 *     <DefenseDocumentCard.Initial document={doc} status={status} />
 *   </DefenseDocumentCard.Body>
 * </DefenseDocumentCard.Root>
 */
export const DefenseDocumentCard = {
  Root: LatestDocumentCardRoot,
  Header: LatestDocumentCardHeader,
  Body: LatestDocumentCardBody,
  Initial: LatestDocumentCardInitial,
  Resubmitted: LatestDocumentCardResubmitted,
  CircleHistoryState,
  StatusPill,
  GhostButton,
  StatusLine,
}

// Backward compat alias — LatestDocumentCard was renamed to DefenseDocumentCard
export const LatestDocumentCard = DefenseDocumentCard

export { LatestDocumentCardRoot } from './Root'
export { LatestDocumentCardHeader } from './Header'
export { LatestDocumentCardBody } from './Body'
export { LatestDocumentCardInitial } from './Initial'
export { LatestDocumentCardResubmitted } from './Resubmitted'
export { CircleHistoryState } from './CircleHistoryState'
export { StatusPill } from './StatusPill'
export { GhostButton } from './GhostButton'
export { StatusLine } from './StatusLine'
export type { LatestDocumentInfo, InitialDocumentStatus } from './Initial'
export type { ResubmittedDocumentInfo } from './Resubmitted'
