import { RepositorySkeleton } from '@/components/repository/RepositorySkeleton'
import { PageLabel } from '@/components/globals/PageLabel'

/**
 * Streaming fallback for /repository.
 *
 * The page is Partial Prerendered: the archive list is served from
 * getArchivedCapstonesData() ('use cache'), while the session read and the
 * per-user favorites read are dynamic. This file is the fallback for that
 * dynamic part, so it must match RepositoryClient's real layout — an earlier
 * version rendered a table skeleton against a card list, which made the swap
 * to loaded content more visible rather than less.
 */
export default function RepositoryLoading() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Repository" />
      <RepositorySkeleton />
    </section>
  )
}
