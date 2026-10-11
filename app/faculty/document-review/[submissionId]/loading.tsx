import { DefenseWorkspaceSkeleton } from '@/components/defense/DefenseWorkspaceSkeleton'

/**
 * Streaming fallback for the submission workspace.
 *
 * The page renders DocumentWorkspace or FinalizedWorkspaceView — both share
 * the same workspace chrome (64px header + PDF viewer area) that
 * DefenseWorkspaceSkeleton already mirrors.
 */
export default function SubmissionWorkspaceLoading() {
  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden">
      <DefenseWorkspaceSkeleton />
    </section>
  )
}
