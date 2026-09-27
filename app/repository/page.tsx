import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PageLabel } from '@/components/globals/PageLabel'
import { getMyFavoriteArchiveIds, getRepositoryArchives } from '@/lib/actions/repository'
import { RepositoryClient } from '@/components/repository/RepositoryClient'

/**
 * Repository — CapstoneArchive blobs under `archives/*` are PRIVATE.
 *
 * The Vercel Blob store rejects `access: 'public'`, so `publishArchive` and
 * `updateArchive` upload with `access: 'private'`. The DB
 * `CapstoneArchive.blobUrl` is still the full https://…vercel-storage.com/archives/…
 * URL, but the browser must NOT open it directly — it 401s.
 *
 * `RepositoryClient` derives the pathname and fetches
 * `GET /api/blob/archives/...` with credentials, then opens an object URL.
 * The route's global gate is the entire policy: any signed-in, non-deleted
 * user of any role (GUEST included) may read published work; signed-out
 * callers get 401. See lib/blob.ts for the full note.
 *
 * This page itself stays ungated (proxy.ts has no guard), so a signed-out
 * visitor still sees the catalogue and gets a "Sign in to open" toast rather
 * than a raw 401.
 *
 * Chapter/defense/archiving (`chapter/*`, `defense/*`, `archiving/*`) are
 * group-scoped and are fetched the same way but authorized more strictly.
 */

export default async function RepositoryPage() {
  const res = await getRepositoryArchives()
  const archives = res.success && res.payload ? res.payload : []

  // Client-side UI gating only — /repository stays public in proxy.ts,
  // enforcement lives in the server actions (requireAdmin).
  const session = await getServerSession(authOptions)
  const role = session?.user?.role as string | undefined
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'

  // Per-user and deliberately outside the cached archive read: this must not
  // be folded into getArchivedCapstonesData(), whose cache tag is shared by
  // every visitor. null means signed out — the client renders every star unset.
  const favoriteIds = await getMyFavoriteArchiveIds()

  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Repository" />
      <RepositoryClient
        archives={archives}
        isAdmin={isAdmin}
        favoriteIds={favoriteIds ?? []}
        canFavorite={favoriteIds !== null}
      />
    </section>
  )
}
