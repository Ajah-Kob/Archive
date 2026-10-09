import { notFound } from 'next/navigation'
import { getRepositoryArchive } from '@/lib/actions/repository'
import { RepositoryReaderView } from '@/components/repository/RepositoryReaderView'

/**
 * Repository reader — /repository/[id].
 *
 * Public like the catalogue (proxy.ts has no guard for /repository): anyone
 * can reach this page, and the signed blob route re-checks access when the
 * viewer fetches the bytes. Signed-out visitors get the viewer's inline
 * unauthorized state rather than a raw 401.
 */
export default async function RepositoryReaderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const res = await getRepositoryArchive(parseInt(id, 10))
  const archive = res.success && res.payload ? res.payload : null
  if (!archive) notFound()

  return (
    <section className="h-full flex flex-col">
      <RepositoryReaderView
        title={archive.title}
        blobUrl={archive.blobUrl}
        fileName={archive.fileName}
      />
    </section>
  )
}
