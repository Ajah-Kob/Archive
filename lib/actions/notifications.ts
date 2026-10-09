'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/actions/guard'

export interface NotificationItem {
  id: number
  title: string
  body: string | null
  href: string | null
  readAt: string | null
  createdAt: string
}

function toItem(row: {
  id: number
  title: string
  body: string | null
  href: string | null
  readAt: Date | null
  createdAt: Date
}): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

async function ownUserId(userId: number) {
  const session = await getSession()
  if (!session?.user?.id || +session.user.id !== userId) return null
  return userId
}

export async function getMyNotifications(userId: number) {
  if (!(await ownUserId(userId))) {
    return { success: false, payload: null, message: 'Not authorized' }
  }
  try {
    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return { success: true, payload: rows.map(toItem) }
  } catch {
    return { success: false, payload: null, message: 'Failed to get notifications' }
  }
}

export async function markNotificationRead(id: number) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, message: 'Not authorized' }
  }
  try {
    const row = await prisma.notification.findFirst({
      where: { id, userId: +session.user.id },
      select: { id: true, readAt: true },
    })
    if (!row) return { success: false, message: 'Notification not found.' }
    if (!row.readAt) {
      await prisma.notification.update({
        where: { id: row.id },
        data: { readAt: new Date() },
      })
    }
    return { success: true, message: 'Marked as read.' }
  } catch {
    return { success: false, message: 'Failed to update notification.' }
  }
}

export async function markAllNotificationsRead(userId: number) {
  if (!(await ownUserId(userId))) {
    return { success: false, message: 'Not authorized' }
  }
  try {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
    return { success: true, message: 'All notifications marked as read.' }
  } catch {
    return { success: false, message: 'Failed to update notifications.' }
  }
}
