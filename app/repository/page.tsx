import { PageLabel } from '@/components/globals/PageLabel'
import { getRepositoryArchives } from '@/lib/actions/repository'
import { RepositoryClient } from '@/components/repository/RepositoryClient'

export default async function RepositoryPage() {
  const res = await getRepositoryArchives()
  const archives = res.success && res.payload ? res.payload : []

  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Repository" />
      <RepositoryClient archives={archives} />
    </section>
  )
}
