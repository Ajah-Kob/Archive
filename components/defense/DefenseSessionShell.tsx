'use client'

import { DefenseSessionTabs } from './DefenseSessionTabs'
import { SessionTabPanel } from './SessionTabPanel'
import { ResubmissionTabPanel } from './ResubmissionTabPanel'
import type { DefenseSessionPayload } from '@/lib/actions/defense'

interface DefenseSessionShellProps {
  session: DefenseSessionPayload
  backHref?: string
}

/**
 * DefenseSessionShell — refactored to DefenseSessionTabs + SessionTabPanel + ResubmissionTabPanel composition.
 *
 * - Removes direct DefenseSessionPanelistView usage; SessionTabPanel shows initial document only
 *   (submissions.filter isInitial, not resubmissions latest) — feedback pinned to v1 initial.
 * - Resubmission tab shows callout (For Review amber / Need Revision red / Approved green via
 *   deriveResubmissionStatus) + latest resubmitted document (resubmissions[resubmissions.length-1] latest !isInitial)
 *   + ApprovalChecklist per-panelist (deriveApprovalChecklist, isPanelistReadOnly, shouldResetOnResubmission).
 * - Preserves DocumentHistoryDrawer (initial + resubmissions, scheduleId prop, open/close via
 *   ContextBar onDocumentHistory) via DefenseSessionTabs.Root which derives initial/resubmissions/scheduleId from session.
 * - Preserves ContextBar with Back to Defense + Document History button (py-[14px] px-8 bg #eef2ff border #dfe3fb)
 *   using DefenseSessionContextBar inside DefenseSessionTabs.Root (h-[40px] tabs with 2px indicator).
 * - canResubmit business rule preserved (verdict MINOR_REVISION/MAJOR_REVISION && resubmission==null) in
 *   lib/actions/student-defense.ts — not modified here; Session/Resubmission tabs keep same business logic.
 */
export function DefenseSessionShell({
  session,
  backHref = '/faculty/defense',
}: DefenseSessionShellProps) {
  return (
    <DefenseSessionTabs.Root session={session} backHref={backHref}>
      <DefenseSessionTabs.TabPanel value="session">
        <SessionTabPanel session={session} />
      </DefenseSessionTabs.TabPanel>
      <DefenseSessionTabs.TabPanel value="resubmission">
        <ResubmissionTabPanel session={session} />
      </DefenseSessionTabs.TabPanel>
    </DefenseSessionTabs.Root>
  )
}

export default DefenseSessionShell
