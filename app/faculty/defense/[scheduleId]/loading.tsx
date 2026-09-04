import { DefenseSessionSkeleton } from '@/components/defense/DefenseSessionSkeleton'

export default function DefenseSessionLoading() {
  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden">
      <DefenseSessionSkeleton />
    </section>
  )
}
