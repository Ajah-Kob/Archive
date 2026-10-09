'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag } from 'next/cache'
import { requireCoordinator } from '@/lib/actions/guard'

export interface SectionActivityEntry {
  id: number
  action: string
  entity: string
  entityId: string | null
  entityName: string | null
  actorName: string
  actorRole: string
  before: unknown
  after: unknown
  createdAt: string
}

/**
 * Coordinator-scoped activity feed for one section.
 *
 * Reads AuditLog rows carrying this section's id. Rows without a sectionId
 * (pre-migration history, or events with no section scope) never appear —
 * the feed starts empty rather than leaking another section's history.
 *
 * Deliberately NOT the admin audit reader (getAuditLogs is requireAdmin):
 * reusing it would expose the whole audit table to any coordinator.
 */
export async function getSectionActivityFeed(
  sectionId: number,
): Promise<{ success: boolean; message: string; payload: SectionActivityEntry[] | null }> {
  // Not 'use cache': the guard resolves the session via headers(), which is a
  // dynamic data source and forbidden inside a cache scope. The feed is
  // per-user and per-section, so shared caching buys little anyway.
  const coordinator = await requireCoordinator()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  try {
    const rows = await prisma.auditLog.findMany({
      where: { sectionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return {
      success: true,
      message: '',
      payload: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        entityName: r.entityName,
        actorName: r.actorName,
        actorRole: r.actorRole,
        before: r.before,
        after: r.after,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  } catch {
    return { success: false, message: 'Failed to load activity.', payload: null }
  }
}
