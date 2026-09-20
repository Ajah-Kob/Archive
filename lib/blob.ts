// lib/blob.ts — shared helpers for private Vercel Blob access via signed route.
//
// Private blobs are stored as `access: 'private'` under a single Vercel store
// (per-upload choice). DB still holds the full https://…vercel-storage.com/{pathname}
// URL, but clients MUST NOT put that URL in <a href> or <EmbedPDF src>.
// Instead derive the pathname and fetch via `GET /api/blob/{pathname}` which
// does a server-side head+auth gate and returns a signed stream/redirect.
//
// Repository `archives/*` stays PUBLIC in this feature (see note below) — that
// prefix is NOT routed through /api/blob/... and continues to use the raw URL.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the Vercel Blob pathname from a stored blobUrl.
 *
 * Examples:
 *   https://xxx.public.blob.vercel-storage.com/chapter/12/CHAPTER_1/foo-abc.pdf
 *     → chapter/12/CHAPTER_1/foo-abc.pdf
 *   https://xxx.public.blob.vercel-storage.com/archiving/5/doc-xyz.pdf
 *     → archiving/5/doc-xyz.pdf
 *   /api/blob/chapter/1/CHAPTER_1/foo.pdf
 *     → chapter/1/CHAPTER_1/foo.pdf
 *   chapter/1/CHAPTER_1/foo.pdf
 *     → chapter/1/CHAPTER_1/foo.pdf
 *
 * Returns '' for invalid/empty input so callers can guard before fetch.
 *
 * This is the shared helper referenced in the acceptance criteria
 * (“e.g. new URL(blobUrl).pathname slice”). Keep it pure and isomorphic.
 */
export function blobUrlToPathname(blobUrl: string | null | undefined): string {
  if (!blobUrl || typeof blobUrl !== 'string') return ''
  const trimmed = blobUrl.trim()
  if (trimmed.length === 0) return ''

  // Already a signed-route path — strip prefix
  if (trimmed.startsWith('/api/blob/')) {
    const withoutPrefix = trimmed.replace(/^\/api\/blob\//, '')
    return withoutPrefix.split('?')[0].split('#')[0].replace(/^\//, '')
  }

  // Relative pathname already (no host) — e.g. "chapter/..." or "/archiving/..."
  if (!trimmed.includes('://')) {
    // Handle leading slash and strip query/hash
    return trimmed.replace(/^\//, '').split('?')[0].split('#')[0]
  }

  // Full https://... blob URL — parse with URL API
  try {
    const url = new URL(trimmed)
    const raw = url.pathname.replace(/^\//, '')
    // Vercel Blob pathname is stored unencoded on the wire; decode once for
    // the route param. If decode fails (malformed %), keep raw.
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  } catch {
    return ''
  }
}

/**
 * Builds the authenticated fetch path for a private blob.
 *
 * Returns '' when the input cannot be mapped, so callers can render an
 * error state instead of a broken <a href>.
 *
 * This path is handled by `app/api/blob/[...pathname]/route.ts` which does
 * `getServerSession` + `deletedAt:null` checks + prefix-gated authorization:
 *   templates/* → role !== GUEST
 *   chapter/*, defense/*, archiving/* → group member OR adviser OR
 *     coordinator-of-section (section-scoped) OR chair/admin
 * Anonymous → 401, wrong section → 403, unknown prefix → 404.
 *
 * On success the route returns 200 (blob stream) or 302 (signed downloadUrl).
 * Viewers must fetch with credentials and handle 401/403 (toast / login redirect).
 */
export function toSignedBlobPath(blobUrl: string | null | undefined): string {
  const pathname = blobUrlToPathname(blobUrl)
  if (!pathname) return ''
  // Encode each segment so spaces and special chars (e.g. "CASE STUDY 2.pdf")
  // survive as a valid fetch URL; the route decodes via decodeURIComponent.
  return `/api/blob/${pathname.split('/').map(encodeURIComponent).join('/')}`
}

/** Alias for defense card compat — same as toSignedBlobPath */
export function getSignedBlobUrl(blobUrl: string | null | undefined): string {
  return toSignedBlobPath(blobUrl)
}

/**
 * Whether a stored blobUrl is a private capstone blob that MUST go through
 * the signed route. `user/*` avatars stay public; `archives/*` (repository)
 * stays public in this private-blobs feature (see repository page note).
 */
export function isPrivateBlobPath(pathname: string): boolean {
  if (!pathname) return false
  return (
    pathname.startsWith('templates/') ||
    pathname.startsWith('chapter/') ||
    pathname.startsWith('defense/') ||
    pathname.startsWith('archiving/')
  )
}

export function isPrivateBlobUrl(blobUrl: string | null | undefined): boolean {
  const pathname = blobUrlToPathname(blobUrl)
  return isPrivateBlobPath(pathname)
}

// Compatibility aliases for callers that import the earlier prose names.
// Keep the canonical names above (blobUrlToPathname / toSignedBlobPath) and
// expose the older identifiers so parallel subtasks don't break.
export const extractBlobPathname = blobUrlToPathname
export const getBlobSignedUrl = toSignedBlobPath
export const toSignedBlobHref = toSignedBlobPath
export const getBlobPathname = blobUrlToPathname

// ───────────────────────────── Repository note ─────────────────────────────
//
// NOTE — Repository archives/* stays PUBLIC in this feature (intentional).
//
// CapstoneArchive blobs under `archives/*` are published to the shared
// Repository at `/repository` and remain `access: 'public'` with a direct
// Vercel Blob URL in `capstoneArchive.blobUrl`. This file's helpers and the
// signed route (`/api/blob/...`) intentionally do NOT handle `archives/*`:
//
//   - app/repository/page.tsx renders `item.blobUrl` directly (no signed fetch).
//   - scripts/migrate-private-blobs.ts skips the `archives/` prefix.
//   - app/api/blob/[...pathname] returns 404 for `archives/*` so the public
//     path remains the only access path.
//
// Rationale: repository is “any role” (proxy.ts has no guard) and is not
// sensitivity-gated like chapter/defense/archiving (group-scoped). If a future
// spec requires repository privatization, add `archives/` to the signed-route
// branch with the same “any signed-in user” or public gate and migrate the
// stored URLs — no schema change.
// ────────────────────────────────────────────────────────────────────────────
