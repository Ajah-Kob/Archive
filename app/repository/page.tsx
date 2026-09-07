import { getRepositoryArchives } from '@/lib/actions/repository'
import { RepositoryClient } from '@/components/repository/RepositoryClient'

export default async function RepositoryPage() {
  const res = await getRepositoryArchives()
  const archives = res.success && res.payload ? res.payload : []

  return <RepositoryClient archives={archives} />
}
