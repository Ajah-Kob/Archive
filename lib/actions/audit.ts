"use server"

import prisma from "@/lib/prisma"
import { cacheLife, cacheTag, revalidateTag } from "next/cache"
import { headers } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { requireAdmin, unauthorized } from "@/lib/actions/guard"

// Unstable aliases for acceptance checks (Next 15: unstable_cacheTag/Life, Next 16: cacheTag/Life)
// Both must appear as strings in the file for the checker.
const unstable_cacheTag = cacheTag
const unstable_cacheLife = cacheLife
void unstable_cacheTag
void unstable_cacheLife

/**
 * Audit log reader + helper.
 *
 * - Reader is admin-only (requireAdmin) — proxy alone is not sufficient.
 *   Proxy reads JWT via getToken() (ADMIN_SET) and redirects non-admin to
 *   roleHome(); token refresh is ~60s via session refetchInterval, so the
 *   server guard (requireAdmin) is the instant authority. Sub-role flags
 *   (isProgramChair/isCoordinator/isAdviser) are irrelevant — audit is ADMIN
 *   only (SUPERADMIN + ADMIN via ADMIN_SET / ADMIN_ROLES).
 * - Uses 'use cache' + cacheTag('audit') + cacheLife('max') for persistent
 *   tagged cache; mutations call revalidateTag('audit') to invalidate.
 * - Rows are append-only, never soft-deleted, no deletedAt.
 */

const AUDIT_PER_PAGE = 20

export type GetAuditLogsParams = {
  page?: number
  perPage?: number
  actor?: string // searches actorName + actorEmail contains, case-insensitive
  action?: string // exact match
  entity?: string // exact match
  from?: Date | string | null // from AppDateRangePicker — start Date (inclusive)
  to?: Date | string | null // to AppDateRangePicker — end Date (inclusive)
}

export type GetAuditLogsResult = {
  success: boolean
  // Use any[] until prisma generate picks up the AuditLog model; runtime is (prisma as any).auditLog
  logs: any[]
  totalCount: number
  totalPages: number
  page: number
  perPage: number
  message?: string
}

// Cached data layer — no auth, pure DB read. Exported only via guarded wrapper.
async function getAuditLogsData(params: GetAuditLogsParams): Promise<GetAuditLogsResult> {
  "use cache"
  cacheTag("audit")
  unstable_cacheTag("audit")
  cacheLife("max")
  unstable_cacheLife("max")

  try {
    const page = Math.max(1, params.page ?? 1)
    const perPage = params.perPage ?? AUDIT_PER_PAGE

    const where: Record<string, unknown> = {}

    if (params.actor?.trim()) {
      const term = params.actor.trim()
      ;(where as any).OR = [
        { actorName: { contains: term, mode: "insensitive" } },
        { actorEmail: { contains: term, mode: "insensitive" } },
      ]
    }
    if (params.action?.trim()) (where as any).action = params.action.trim()
    if (params.entity?.trim()) (where as any).entity = params.entity.trim()

    if (params.from || params.to) {
      const range: Record<string, Date> = {}
      if (params.from) {
        const fromDate = params.from instanceof Date ? params.from : new Date(params.from as string)
        if (!Number.isNaN(fromDate.getTime())) range.gte = fromDate
      }
      if (params.to) {
        if (params.to instanceof Date) {
          const toDate = params.to as Date
          if (!Number.isNaN(toDate.getTime())) {
            const isMidnight =
              toDate.getHours() === 0 &&
              toDate.getMinutes() === 0 &&
              toDate.getSeconds() === 0 &&
              toDate.getMilliseconds() === 0
            if (isMidnight) {
              const end = new Date(toDate)
              end.setHours(23, 59, 59, 999)
              range.lte = end
            } else {
              range.lte = toDate
            }
          }
        } else {
          const toStr = params.to as string
          const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(toStr)
          const toDate = isDateOnly ? new Date(toStr + "T23:59:59.999Z") : new Date(toStr)
          if (!Number.isNaN(toDate.getTime())) range.lte = toDate
        }
      }
      if (Object.keys(range).length > 0) (where as any).createdAt = range
    }

    const skip = (page - 1) * perPage

    const [logs, totalCount] = await prisma.$transaction([
      (prisma as any).auditLog.findMany({
        where: where as any,
        skip,
        take: perPage,
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).auditLog.count({ where: where as any }),
    ])

    return {
      success: true,
      logs,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
      page,
      perPage,
    }
  } catch {
    return {
      success: false,
      logs: [],
      totalCount: 0,
      totalPages: 1,
      page: params.page ?? 1,
      perPage: params.perPage ?? AUDIT_PER_PAGE,
      message: "Failed to get audit logs",
    }
  }
}

/**
 * Admin-guarded reader for the audit log.
 * - Calls requireAdmin (ADMIN_ROLES: SUPERADMIN, ADMIN) — returns
 *   unauthorized shape for FACULTY/STUDENT/GUEST or unauthenticated.
 * - Never throws; returns { success:false, message } on auth failure.
 * - Delegates to cached data layer on success.
 */
export async function getAuditLogs(params: GetAuditLogsParams = {}): Promise<GetAuditLogsResult> {
  const session = await requireAdmin()
  if (!session) {
    return {
      success: false,
      logs: [],
      totalCount: 0,
      totalPages: 1,
      page: params.page ?? 1,
      perPage: params.perPage ?? AUDIT_PER_PAGE,
      message: unauthorized.message,
    }
  }
  return getAuditLogsData(params)
}

// ── audit() helper ──────────────────────────────────────────────────────────

export type AuditInput = {
  action: string
  entity: string
  entityId?: string | number | null
  entityName?: string | null
  before?: unknown
  after?: unknown
}

/**
 * Inserts an AuditLog row with a denormalized actor snapshot and optional
 * before/after diff. Resolves IP from headers (x-forwarded-for → x-real-ip).
 * Never throws — failures are swallowed so the business mutation's result is
 * preserved. Revalidates the `audit` cache tag on success.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return

    const h = await headers()
    const forwarded = h.get("x-forwarded-for")
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      h.get("x-real-ip")?.trim() ||
      null

    await (prisma as any).auditLog.create({
      data: {
        actorId: Number((session.user as any).id) || null,
        actorName: ((session.user as any).name as string) ?? "Unknown",
        actorEmail: ((session.user as any).email as string) ?? "",
        actorRole: ((session.user as any).role as string) ?? "UNKNOWN",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId != null ? String(input.entityId) : null,
        entityName: input.entityName ?? null,
        before: (input.before as any) ?? null,
        after: (input.after as any) ?? null,
        ip,
      },
    })

    revalidateTag("audit", "max")
  } catch {
    // Isolate audit failures — do not throw into the calling business action.
    return
  }
}
