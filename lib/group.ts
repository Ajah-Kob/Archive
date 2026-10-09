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
