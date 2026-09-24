import type {
  DefenseDocumentInfo,
  InitialDocumentStatus,
} from './DefenseDocumentCard'
import type { DocumentHistoryItem } from './DocumentHistoryDrawer'

/** Past (rescheduled) defense schedule shape from getPastDefenseSchedules. */
export interface PastDefenseSchedule {
  id: number
  type: string
  date: string
  venue: string
  verdict: string
  verdictSubmittedAt: string | null
  submissions: Array<{
    id: number
    version: number
    isInitial: boolean
    fileName: string
    blobUrl: string
    size: number
    submittedByName: string
    dateSubmitted: string
  }>
}

/**
 * Maps past schedules to initial-document history items (newest attempt first).
 * Picks each past schedule's initial submission; schedules without one are skipped.
 * Server-safe (no client APIs) — callable from layouts and client components alike.
 */
export function toPastInitialItems(schedules: PastDefenseSchedule[]): DocumentHistoryItem[] {
  return schedules.flatMap((schedule) => {
    const initialSub = schedule.submissions.find((s) => s.isInitial) ?? null
    if (!initialSub) return []
    return [
      {
        info: {
          id: initialSub.id,
          fileName: initialSub.fileName,
          size: initialSub.size,
          submittedAt: initialSub.dateSubmitted,
          blobUrl: initialSub.blobUrl,
          submittedByName: initialSub.submittedByName,
          version: initialSub.version,
          comments: null,
          pages: null,
          reviewedAt: schedule.verdictSubmittedAt,
        } as unknown as DefenseDocumentInfo,
        status: schedule.verdict as InitialDocumentStatus,
        scheduleId: schedule.id,
      },
    ]
  })
}
