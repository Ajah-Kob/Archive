/**
 * One-off migration: re-put existing PUBLIC blobs as PRIVATE, update DB blobUrl fields, delete old, verify.
 *
 * Scope
 *  - Prefixes migrated: `templates/`, `chapter/`, `defense/`, `archiving/`
 *  - NOT migrated: `user/*` (avatars stay public) and by default `archives/` (repository standalone archives stay public).
 *    Pass --include-archives (or env MIGRATE_INCLUDE_ARCHIVES=1) to also migrate `archives/`.
 *    The repository Blob route still returns 404 for archives/* per private-blobs spec — those archives
 *    remain publicly readable via raw blobUrl until explicitly flipped.
 *
 * What it does (per blob, in order)
 *  1. list({ prefix }) with cursor pagination
 *  2. idempotency gate: skip if already private (head without token fails, head with token succeeds)
 *     and skip orphan blobs with no DB reference (logs, no mutation)
 *  3. fetch buffer via old public URL
 *  4. put(pathname, buffer, { access: 'private', addRandomSuffix:false, allowOverwrite:true })
 *  5. update DB: Template.blobUrl, MilestoneSubmission.blobUrl, DefenseSubmission.blobUrl,
 *     ArchivingSubmission.blobUrl, CapstoneArchive.blobUrl (exact oldUrl match; fallback pathname match)
 *  6. del(oldUrl)
 *  7. verify head(newUrl) with token has matching pathname and oldUrl now 404/403
 *
 * Idempotent / safe to re-run
 *  - Re-running skips blobs already private (head check) and blobs whose DB rows already point to the new URL.
 *  - Partial failures don't duplicate: DB update is exact-match only; if DB already updated we treat the old public
 *    object as a stale orphan and delete it without re-putting.
 *  - No destructive action without idempotency: deletes only after successful put + DB update, and orphan deletes
 *    only when a live DB row with same pathname already references a private URL.
 *  - No schema migration — only blobUrl string swaps.
 *
 * Env
 *  - BLOB_READ_WRITE_TOKEN (or VERCEL_BLOB_READ_WRITE_TOKEN) — required, Vercel Blob store RW token
 *  - DATABASE_URL (or DATABASE_URL_UNPOOLED) — required, Neon Postgres (Prisma)
 *  - Optional: BLOB_STORE_TOKEN alias for the same token (some projects use this name)
 *
 * Run
 *  npx tsx scripts/migrate-private-blobs.ts
 *  npx tsx scripts/migrate-private-blobs.ts --dry-run
 *  npx tsx scripts/migrate-private-blobs.ts --include-archives
 *  MIGRATE_INCLUDE_ARCHIVES=1 npx tsx scripts/migrate-private-blobs.ts
 *  node --loader ts-node scripts/migrate-private-blobs.ts  # also works if ts-node is configured
 *
 * Notes
 *  - Single Vercel Blob store, per-upload access choice (no second bucket).
 *  - Keep user/* public — script never lists that prefix.
 *  - Validate with `npx tsc --noEmit` (strict off).
 */

import { list, put, head, del } from '@vercel/blob'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as dotenv from 'dotenv'
import prisma from '@/lib/prisma'

// ── env loading ──────────────────────────────────────────────────────────────
function loadEnv(): void {
  // Prefer .env.local (Vercel `vercel env pull`) then .env
  const candidates = ['.env.local', '.env']
  for (const fname of candidates) {
    const full = path.join(process.cwd(), fname)
    if (fs.existsSync(full)) {
      dotenv.config({ path: full })
      // Don't break — .env.local should win, but if both exist we load both with local first
      // dotenv won't overwrite already-set vars by default, so order matters.
    }
  }
  // Also load default .env if nothing else matched (dotenv default)
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.DATABASE_URL) {
    dotenv.config()
  }
}
loadEnv()

// ── token / db helpers ──────────────────────────────────────────────────────
function resolveBlobToken(): string | null {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ??
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN ??
    process.env.BLOB_STORE_TOKEN ??
    null
  )
}

function resolveDatabaseUrl(): string | null {
  return process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? null
}

// ── constants ───────────────────────────────────────────────────────────────
const DEFAULT_PREFIXES = ['templates/', 'chapter/', 'defense/', 'archiving/'] as const
const ARCHIVES_PREFIX = 'archives/'
const LIST_LIMIT = 1000

type PrefixStats = {
  prefix: string
  listed: number
  migrated: number
  skippedPrivate: number
  skippedOrphan: number
  skippedStaleDeleted: number
  failed: number
  verifyPass: number
  verifyFail: number
  dbRowsUpdated: number
}

type BlobEntry = {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
  downloadUrl: string
}

// ── small pure helpers ──────────────────────────────────────────────────────
function pathnameFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const raw = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname
    return decodeURIComponent(raw)
  } catch {
    return url
  }
}

function blobPathname(blob: any): string {
  if (blob?.pathname && typeof blob.pathname === 'string') return blob.pathname
  return pathnameFromUrl(blob.url)
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// ── DB helpers (exact + pathname fallback) ──────────────────────────────────
async function countExactMatches(oldUrl: string): Promise<number> {
  const [t, ms, ds, as, ca] = await Promise.all([
    prisma.template.count({ where: { blobUrl: oldUrl } }),
    prisma.milestoneSubmission.count({ where: { blobUrl: oldUrl } }),
    prisma.defenseSubmission.count({ where: { blobUrl: oldUrl } }),
    (prisma as any).archivingSubmission.count({ where: { blobUrl: oldUrl } }),
    prisma.capstoneArchive.count({ where: { blobUrl: oldUrl } }),
  ])
  return t + ms + ds + as + ca
}

async function findNewUrlByPathname(pathname: string, excludeUrl: string): Promise<string | null> {
  // Search each table for a row whose blobUrl pathname matches `pathname` but url differs.
  const tables: Array<{ model: any; name: string }> = [
    { model: prisma.template, name: 'Template' },
    { model: prisma.milestoneSubmission, name: 'MilestoneSubmission' },
    { model: prisma.defenseSubmission, name: 'DefenseSubmission' },
    { model: (prisma as any).archivingSubmission, name: 'ArchivingSubmission' },
    { model: prisma.capstoneArchive, name: 'CapstoneArchive' },
  ]
  for (const { model } of tables) {
    // Pull candidates where blobUrl contains the tail filename to narrow DB scan.
    // Using `contains` avoids fetching entire table when prefix is selective.
    const tail = pathname.split('/').pop() ?? pathname
    if (!tail) continue
    const rows: Array<{ blobUrl: string }> = await model.findMany({
      where: { blobUrl: { contains: tail } },
      select: { blobUrl: true },
      take: 50,
    })
    for (const r of rows) {
      if (!r.blobUrl || r.blobUrl === excludeUrl) continue
      if (pathnameFromUrl(r.blobUrl) === pathname) return r.blobUrl
    }
  }
  return null
}

async function updateDbUrls(oldUrl: string, newUrl: string, pathname: string): Promise<number> {
  // Primary: exact URL match.
  const results = await Promise.all([
    prisma.template.updateMany({ where: { blobUrl: oldUrl }, data: { blobUrl: newUrl } }),
    prisma.milestoneSubmission.updateMany({ where: { blobUrl: oldUrl }, data: { blobUrl: newUrl } }),
    prisma.defenseSubmission.updateMany({ where: { blobUrl: oldUrl }, data: { blobUrl: newUrl } }),
    (prisma as any).archivingSubmission.updateMany({ where: { blobUrl: oldUrl }, data: { blobUrl: newUrl } }),
    prisma.capstoneArchive.updateMany({ where: { blobUrl: oldUrl }, data: { blobUrl: newUrl } }),
  ])
  const exactUpdated = results.reduce((sum, r: any) => sum + (r?.count ?? 0), 0)
  if (exactUpdated > 0) return exactUpdated

  // Fallback: pathname match — handles host-rotation where stored URL's host differs but pathname identical.
  // Only runs when exact found nothing, to keep idempotency and avoid broad writes.
  let fallbackUpdated = 0
  const tail = pathname.split('/').pop() ?? pathname
  const tables: Array<{ model: any }> = [
    { model: prisma.template },
    { model: prisma.milestoneSubmission },
    { model: prisma.defenseSubmission },
    { model: (prisma as any).archivingSubmission },
    { model: prisma.capstoneArchive },
  ]
  for (const { model } of tables) {
    const candidates: Array<{ id: number; blobUrl: string }> = await model.findMany({
      where: { blobUrl: { contains: tail } },
      select: { id: true, blobUrl: true },
      take: 200,
    })
    const matchingIds = candidates
      .filter((c) => c.blobUrl && pathnameFromUrl(c.blobUrl) === pathname && c.blobUrl !== newUrl)
      .map((c) => c.id)
    if (matchingIds.length === 0) continue
    // Update each matching row individually by id to avoid colliding with unrelated `contains` false positives.
    for (const id of matchingIds) {
      await model.update({ where: { id }, data: { blobUrl: newUrl } })
      fallbackUpdated++
    }
  }
  return fallbackUpdated
}

// ── blob access helpers ─────────────────────────────────────────────────────
async function isAlreadyPrivate(url: string, token: string): Promise<boolean> {
  // Public blobs: head without token succeeds.
  // Private blobs: head without token throws, head with token succeeds.
  // Deleted/missing: both throw.
  try {
    await head(url)
    return false
  } catch {
    try {
      await head(url, { token } as any)
      return true
    } catch {
      return false
    }
  }
}

async function fetchBuffer(oldUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(oldUrl)
  if (!res.ok) throw new Error(`fetch old blob failed: ${res.status} ${res.statusText} for ${oldUrl}`)
  const ab = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  return { buffer: Buffer.from(ab), contentType }
}

async function verifyMigration(
  oldUrl: string,
  newUrl: string,
  pathname: string,
  token: string,
): Promise<{ newOk: boolean; oldGone: boolean }> {
  let newOk = false
  try {
    const meta: any = await head(newUrl, { token } as any)
    newOk = meta?.pathname === pathname
    if (!newOk) console.warn(`  verify: head(newUrl) pathname mismatch: got ${meta?.pathname} expected ${pathname}`)
  } catch (e) {
    console.warn(`  verify: head(newUrl) failed: ${e}`)
  }

  let oldGone = false
  try {
    await head(oldUrl, { token } as any)
    oldGone = false
  } catch {
    oldGone = true
  }
  if (!oldGone) {
    try {
      const res = await fetch(oldUrl, { method: 'HEAD' } as any)
      oldGone = res.status === 404 || res.status === 403 || (res.status as number) === 401
    } catch {
      oldGone = true
    }
    // Final try with GET if HEAD was inconclusive
    if (!oldGone) {
      try {
        const res2 = await fetch(oldUrl)
        oldGone = !res2.ok && (res2.status === 404 || res2.status === 403 || (res2.status as number) === 401)
      } catch {
        oldGone = true
      }
    }
  }
  return { newOk, oldGone }
}

// ── per-blob migration ──────────────────────────────────────────────────────
async function migrateOneBlob(
  blob: BlobEntry,
  token: string,
  opts: { dryRun: boolean },
  stats: PrefixStats,
): Promise<void> {
  const oldUrl = blob.url
  const pathname = blobPathname(blob as any)

  // Guard: never touch user/* (defense in depth — we never list it, but skip if it slips through)
  if (pathname.startsWith('user/')) {
    console.log(`  SKIP user/* (public avatar, not migrated): ${pathname}`)
    stats.skippedOrphan++
    return
  }

  // Idempotency: already private → skip
  if (await isAlreadyPrivate(oldUrl, token)) {
    console.log(`  SKIP already-private: ${pathname}`)
    stats.skippedPrivate++
    return
  }

  // DB gate: does any row still reference oldUrl?
  const exactMatches = await countExactMatches(oldUrl)
  if (exactMatches === 0) {
    // No exact match — check if DB already points to a private URL with same pathname (stale public orphan).
    const newUrlForPath = await findNewUrlByPathname(pathname, oldUrl)
    if (newUrlForPath) {
      // Verify the DB's new URL is indeed private/live before deleting orphan.
      let privateLive = false
      try {
        await head(newUrlForPath, { token } as any)
        privateLive = true
      } catch {
        privateLive = false
      }
      if (privateLive) {
        console.log(`  STALE orphan (DB already migrated): ${pathname}`)
        console.log(`    DB now points to: ${newUrlForPath}`)
        console.log(`    old public URL:   ${oldUrl}`)
        if (opts.dryRun) {
          console.log('    [dry-run] would del(oldUrl)')
          stats.skippedStaleDeleted++
          return
        }
        try {
          await del(oldUrl, { token } as any)
          stats.skippedStaleDeleted++
          const v = await verifyMigration(oldUrl, newUrlForPath, pathname, token)
          if (v.newOk && v.oldGone) {
            console.log(`    verify STALE delete: PASS (new head ok, old 404/403)`)
            stats.verifyPass++
          } else {
            console.log(`    verify STALE delete: FAIL newOk=${v.newOk} oldGone=${v.oldGone}`)
            stats.verifyFail++
          }
        } catch (e) {
          console.warn(`    del stale orphan failed: ${e}`)
          stats.failed++
        }
        return
      }
    }
    console.log(`  SKIP orphan/no DB match: ${pathname} -> ${oldUrl.slice(0, 80)}...`)
    stats.skippedOrphan++
    return
  }

  console.log(`  → migrating: ${pathname} (${formatBytes(blob.size)}) — ${exactMatches} DB row(s) reference old URL`)
  if (opts.dryRun) {
    console.log('    [dry-run] would fetch, put private, update DB, del old, verify')
    stats.migrated++
    return
  }

  // 1) fetch
  let buffer: Buffer
  let contentType: string
  try {
    const fetched = await fetchBuffer(oldUrl)
    buffer = fetched.buffer
    contentType = fetched.contentType
    // Prefer blob's contentType if fetch fell back to octet-stream.
    // list does not expose contentType in all SDK versions, so fetch header is primary.
    if (contentType === 'application/octet-stream') {
      // Try head for precise type
      try {
        const meta: any = await head(oldUrl, { token } as any).catch(() => null)
        if (meta?.contentType) contentType = meta.contentType
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.warn(`    fetch FAILED: ${e}`)
    stats.failed++
    return
  }

  // 2) put private at same pathname (no random suffix, allow overwrite)
  let newUrl: string
  try {
    const res = await put(pathname, buffer, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      token,
    } as any)
    newUrl = (res as any).url
    console.log(`    put private OK: ${pathname} -> ${newUrl.slice(0, 80)}...`)
  } catch (e) {
    console.warn(`    put FAILED for ${pathname}: ${e}`)
    stats.failed++
    return
  }

  // 3) DB update (exact match, fallback pathname)
  let updatedRows = 0
  try {
    updatedRows = await updateDbUrls(oldUrl, newUrl, pathname)
    if (updatedRows === 0) {
      console.warn(`    DB update: 0 rows matched (orphan raced?) — will keep new blob but not delete old yet`)
      // Don't delete old if DB didn't update — avoids orphaning new blob without DB pointer.
      // Next run will handle as stale orphan if needed.
      stats.failed++
      // Verify new head anyway
      const v = await verifyMigration(oldUrl, newUrl, pathname, token)
      console.log(`    verify (no DB update): newOk=${v.newOk} oldGone=${v.oldGone}`)
      if (v.newOk) stats.verifyPass++
      else stats.verifyFail++
      return
    }
    console.log(`    DB updated: ${updatedRows} row(s) ${oldUrl.slice(0, 40)}... -> ${newUrl.slice(0, 40)}...`)
    stats.dbRowsUpdated += updatedRows
  } catch (e) {
    console.warn(`    DB update FAILED: ${e}`)
    // Clean up new blob to avoid orphan private object without DB pointer (best-effort)
    try {
      await del(newUrl, { token } as any)
      console.log('    cleaned up new private blob after DB failure')
    } catch {
      // ignore cleanup failure — will be detected as orphan with DB pathname mismatch next run
    }
    stats.failed++
    return
  }

  // 4) delete old public blob (only after DB success)
  try {
    await del(oldUrl, { token } as any)
    console.log('    del old public OK')
  } catch (e) {
    console.warn(`    del old FAILED (DB already updated, will be stale orphan next run): ${e}`)
    // Don't count as full failure — DB already migrated, orphan will be cleaned next run
    stats.failed++
    // Still verify
    const v = await verifyMigration(oldUrl, newUrl, pathname, token)
    if (v.newOk) stats.verifyPass++
    else stats.verifyFail++
    stats.migrated++
    return
  }

  // 5) verify
  const v = await verifyMigration(oldUrl, newUrl, pathname, token)
  if (v.newOk && v.oldGone) {
    console.log(`    verify: PASS (head(new) pathname ok, old 404/403)`)
    stats.verifyPass++
  } else {
    console.warn(`    verify: FAIL newOk=${v.newOk} oldGone=${v.oldGone}`)
    stats.verifyFail++
  }
  stats.migrated++
}

// ── list + paginate per prefix ──────────────────────────────────────────────
async function listAllForPrefix(prefix: string, token: string): Promise<BlobEntry[]> {
  const all: BlobEntry[] = []
  let cursor: string | undefined
  let hasMore = true
  while (hasMore) {
    const res: any = await list({ prefix, cursor, limit: LIST_LIMIT, token } as any)
    const blobs: BlobEntry[] = res.blobs ?? []
    all.push(...blobs)
    cursor = res.cursor
    hasMore = !!res.hasMore
    if (hasMore && !cursor) {
      // Defensive: hasMore true but no cursor → break to avoid infinite loop
      console.warn(`  list for ${prefix}: hasMore true but no cursor, stopping pagination`)
      break
    }
  }
  return all
}

async function runPrefix(
  prefix: string,
  token: string,
  opts: { dryRun: boolean },
): Promise<PrefixStats> {
  const stats: PrefixStats = {
    prefix,
    listed: 0,
    migrated: 0,
    skippedPrivate: 0,
    skippedOrphan: 0,
    skippedStaleDeleted: 0,
    failed: 0,
    verifyPass: 0,
    verifyFail: 0,
    dbRowsUpdated: 0,
  }

  console.log(`\n=== prefix: ${prefix} ===`)
  let blobs: BlobEntry[]
  try {
    blobs = await listAllForPrefix(prefix, token)
  } catch (e) {
    console.error(`list FAILED for prefix ${prefix}: ${e}`)
    stats.failed++
    return stats
  }
  stats.listed = blobs.length
  console.log(`listed ${blobs.length} blob(s) for ${prefix}`)

  if (blobs.length === 0) return stats

  for (const blob of blobs) {
    try {
      await migrateOneBlob(blob, token, opts, stats)
    } catch (e) {
      console.warn(`  UNHANDLED error for ${blobPathname(blob as any)}: ${e}`)
      stats.failed++
    }
  }

  console.log(
    `prefix ${prefix} done: listed=${stats.listed} migrated=${stats.migrated} ` +
      `skippedPrivate=${stats.skippedPrivate} skippedOrphan=${stats.skippedOrphan} ` +
      `staleDeleted=${stats.skippedStaleDeleted} failed=${stats.failed} ` +
      `verifyPass=${stats.verifyPass} verifyFail=${stats.verifyFail} dbRows=${stats.dbRowsUpdated}`,
  )
  return stats
}

// ── CLI / main ──────────────────────────────────────────────────────────────
function parseArgs(): { dryRun: boolean; includeArchives: boolean; prefixes: string[] } {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('--dry') || process.env.MIGRATE_DRY_RUN === '1'
  const includeArchives =
    args.includes('--include-archives') ||
    args.includes('--include-archives=true') ||
    args.includes('--archives') ||
    process.env.MIGRATE_INCLUDE_ARCHIVES === '1' ||
    process.env.INCLUDE_ARCHIVES === '1'

  // Allow --prefix=templates/ to run single prefix (useful for testing)
  const single = args.find((a) => a.startsWith('--prefix='))
  let prefixes: string[]
  if (single) {
    const p = single.split('=')[1]?.trim()
    prefixes = p ? [p.endsWith('/') ? p : `${p}/`] : [...DEFAULT_PREFIXES]
  } else {
    prefixes = [...DEFAULT_PREFIXES]
    if (includeArchives) prefixes.push(ARCHIVES_PREFIX)
  }

  return { dryRun, includeArchives, prefixes }
}

async function main(): Promise<void> {
  const { dryRun, includeArchives, prefixes } = parseArgs()
  const token = resolveBlobToken()
  const dbUrl = resolveDatabaseUrl()

  console.log('— migrate-private-blobs —')
  console.log(`prefixes: ${prefixes.join(', ')}${includeArchives ? ' (archives included)' : ' (archives excluded — repository stays public)'}`)
  console.log(`dryRun: ${dryRun}`)
  console.log(`token: ${token ? `${token.slice(0, 8)}...${token.slice(-4)}` : 'MISSING'}`)
  console.log(`database: ${dbUrl ? `${dbUrl.slice(0, 18)}...` : 'MISSING'}`)
  console.log(`cwd: ${process.cwd()}`)

  if (!token) {
    console.error('\nERROR: BLOB_READ_WRITE_TOKEN (or VERCEL_BLOB_READ_WRITE_TOKEN) is required.')
    console.error('Set it in .env.local or export it before running.')
    process.exit(1)
  }
  if (!dbUrl) {
    console.error('\nERROR: DATABASE_URL (or DATABASE_URL_UNPOOLED) is required for DB blobUrl swaps.')
    process.exit(1)
  }

  if (dryRun) console.log('\n[DRY RUN] No puts, DB writes, or deletes will be executed.\n')
  console.log(`NOTE: user/* is never listed or migrated (avatars stay public).`)
  if (!includeArchives) {
    console.log(`NOTE: archives/* not migrated by default (repository stays public). Use --include-archives to flip it.`)
  }

  const allStats: PrefixStats[] = []
  for (const prefix of prefixes) {
    // Safety: never allow user/* even if passed via --prefix
    if (prefix.startsWith('user/')) {
      console.warn(`Refusing to migrate prefix ${prefix} (user/* must stay public) — skipping`)
      continue
    }
    const s = await runPrefix(prefix, token, { dryRun })
    allStats.push(s)
  }

  // Summary
  const totals = allStats.reduce(
    (acc, s) => ({
      listed: acc.listed + s.listed,
      migrated: acc.migrated + s.migrated,
      skippedPrivate: acc.skippedPrivate + s.skippedPrivate,
      skippedOrphan: acc.skippedOrphan + s.skippedOrphan,
      skippedStaleDeleted: acc.skippedStaleDeleted + s.skippedStaleDeleted,
      failed: acc.failed + s.failed,
      verifyPass: acc.verifyPass + s.verifyPass,
      verifyFail: acc.verifyFail + s.verifyFail,
      dbRowsUpdated: acc.dbRowsUpdated + s.dbRowsUpdated,
    }),
    { listed: 0, migrated: 0, skippedPrivate: 0, skippedOrphan: 0, skippedStaleDeleted: 0, failed: 0, verifyPass: 0, verifyFail: 0, dbRowsUpdated: 0 },
  )

  console.log('\n— SUMMARY —')
  for (const s of allStats) {
    console.log(
      `  ${s.prefix}: listed=${s.listed} migrated=${s.migrated} privateSkip=${s.skippedPrivate} orphanSkip=${s.skippedOrphan} staleDel=${s.skippedStaleDeleted} failed=${s.failed} verifyPass=${s.verifyPass} verifyFail=${s.verifyFail} dbRows=${s.dbRowsUpdated}`,
    )
  }
  console.log(
    `TOTALS: listed=${totals.listed} migrated=${totals.migrated} privateSkip=${totals.skippedPrivate} orphanSkip=${totals.skippedOrphan} staleDel=${totals.skippedStaleDeleted} failed=${totals.failed} verifyPass=${totals.verifyPass} verifyFail=${totals.verifyFail} dbRows=${totals.dbRowsUpdated}`,
  )

  if (dryRun) console.log('\n[dry-run] No mutations were made. Re-run without --dry-run to migrate.')
  else if (totals.failed > 0 || totals.verifyFail > 0) {
    console.log('\nSome blobs failed or failed verification — re-run is safe (idempotent) after fixing token/DB/network.')
  } else {
    console.log('\nAll done. Re-running is safe (idempotent) — already-private blobs will be skipped.')
  }
}

main()
  .catch((e) => {
    console.error('FATAL:', e)
    process.exit(1)
  })
  .finally(async () => {
    try {
      await prisma?.$disconnect?.()
    } catch {
      // ignore
    }
  })
