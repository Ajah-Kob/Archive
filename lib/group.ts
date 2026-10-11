import prisma from '@/lib/prisma'

/** Resolves a group's section for audit scoping. Null when unknown — the
 * row is still written, it just never appears in a section feed. */
export async function sectionIdForGroup(groupId: number): Promise<number | null> {
  const group = await prisma.group.findFirst({
    where: { id: groupId, deletedAt: null },
    select: { sectionId: true },
  })
  return group?.sectionId ?? null
}

/** Maps userIds to live faculty honorifics. Users without a live faculty
 * record are absent from the map — callers fall back to plain names. */
export async function honorificsForUserIds(
  userIds: number[],
): Promise<Map<number, string>> {
  const ids = [...new Set(userIds.filter((id) => Number.isInteger(id)))]
  if (ids.length === 0) return new Map()
  const rows = await prisma.faculty.findMany({
    where: { userId: { in: ids }, deletedAt: null },
    select: { userId: true, honorific: true },
  })
  const map = new Map<number, string>()
  for (const row of rows) {
    const title = (row as unknown as { honorific: string | null }).honorific
    if (title?.trim()) map.set(row.userId, title.trim())
  }
  return map
}
