import { DefenseWorkspaceSkeleton } from '@/components/defense/DefenseWorkspaceSkeleton'

export default function DefenseWorkspaceLoading() {
  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden">
      <DefenseWorkspaceSkeleton />
    </section>
  )
}
