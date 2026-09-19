import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PageLabel } from '@/components/globals/PageLabel'
import { getRepositoryArchives } from '@/lib/actions/repository'
import { RepositoryClient } from '@/components/repository/RepositoryClient'

/**
 * Repository — CapstoneArchive blobs (`archives/*`) stay PUBLIC in the
 * private-blobs feature (intentional, per subtask 03). The DB
 * `CapstoneArchive.blobUrl` remains a direct https://…vercel-storage.com/archives/…
 * URL and `RepositoryClient` renders it directly in <a href={item.blobUrl}> / window.open.
 *
 * `archives/*` is NOT routed through GET /api/blob/... (that route returns 404 for
 * archives/ and the migration script skips the prefix). If a future spec
 * privatizes the repository, add `archives/` to the signed-route branch and
 * migrate stored URLs — no schema change. See lib/blob.ts note.
 *
 * Chapter/defense/archiving (`chapter/*`, `defense/*`, `archiving/*`) are
 * private and MUST be fetched via the signed route:
 *   pathname = blobUrlToPathname(blobUrl) // new URL(blobUrl).pathname slice
 *   signedHref = `/api/blob/${pathname}`   // GET with credentials, 401/403 handled
 * and rendered from a fetched object URL, not the raw blobUrl.
 * Public repository links remain working; private links require auth (curl 401).
 */

export default async function RepositoryPage() {
  const res = await getRepositoryArchives()
  const archives = res.success && res.payload ? res.payload : []

  // Client-side UI gating only — /repository stays public in proxy.ts,
  // enforcement lives in the server actions (requireAdmin).
  // NOTE: archives/* is excluded from the private-blobs signed route; see
  // file header and lib/blob.ts for the explicit decision to keep repository public.
  const session = await getServerSession(authOptions)
  const role = session?.user?.role as string | undefined
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'

  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Repository" />
      <RepositoryClient archives={archives} isAdmin={isAdmin} />
    </section>
  )
}
