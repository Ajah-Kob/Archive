/**
 * Throwaway verification: compares chair-dashboard aggregates against the
 * counts the existing pages already show, so the demo cannot display a number
 * that contradicts /faculty/section-management or /faculty/faculty-management.
 *
 * Run: npx tsx --env-file=.env.local scripts/verify-chair-dashboard.ts
 */
import prisma from '../lib/prisma'

async function main() {
  const CAP = 8
  const LOADED_FLOOR = 2

  const [total, assigned, capstone2Count] = await prisma.$transaction([
    prisma.section.count({ where: { deletedAt: null } }),
    prisma.section.count({ where: { deletedAt: null, coordinatorId: { not: null } } }),
    prisma.section.count({ where: { deletedAt: null, capstone2OpenedAt: { not: null } } }),
  ])

  const advisers = await prisma.adviser.findMany({
    where: { deletedAt: null },
    select: { _count: { select: { groups: { where: { deletedAt: null } } } } },
  })
  const held = advisers.map((a) => a._count.groups)
  const available = held.filter((n) => n < LOADED_FLOOR).length
  const loaded = held.filter((n) => n >= LOADED_FLOOR && n < CAP).length
  const fullLoad = held.filter((n) => n >= CAP).length

  const byVerdict = await prisma.defenseSchedule.groupBy({
    by: ['verdict'],
    where: { deletedAt: null },
    _count: { _all: true },
  })
  const v = (name: string) => byVerdict.find((r) => r.verdict === name)?._count._all ?? 0

  const rows: [string, string | number][] = [
    ['Sections (total)', total],
    ['  assigned', assigned],
    ['  unassigned  <-- MUST BE RED', total - assigned],
    ['Advisers (total)', advisers.length],
    ['  available (0-1)', available],
    ['  loaded (2-7)', loaded],
    ['  full load (8+)', fullLoad],
    ['  sum check', available + loaded + fullLoad === advisers.length ? 'OK' : 'MISMATCH'],
    ['Sections Capstone 1', total - capstone2Count],
    ['Sections Capstone 2', capstone2Count],
    ['Defence PENDING (For Defense)', v('PENDING')],
    ['Defence APPROVED', v('APPROVED')],
    ['Defence MINOR_REVISION', v('MINOR_REVISION')],
    ['Defence MAJOR_REVISION', v('MAJOR_REVISION')],
    ['Defence REDEFENSE (Redefense Required)', v('REDEFENSE')],
    ['Defence outcome total', v('APPROVED') + v('MINOR_REVISION') + v('MAJOR_REVISION') + v('REDEFENSE')],
  ]

  console.log('\n=== CHAIR DASHBOARD — live aggregates ===\n')
  for (const [k, val] of rows) console.log(`  ${k.padEnd(42)} ${val}`)
  console.log('\n  adviser load distribution:')
  const dist = new Map<number, number>()
  for (const n of held) dist.set(n, (dist.get(n) ?? 0) + 1)
  for (const n of [...dist.keys()].sort((a, b) => a - b))
    console.log(`    ${n} group(s): ${dist.get(n)} adviser(s)`)
  console.log('\n  sections without a coordinator:')
  const unassigned = await prisma.section.findMany({
    where: { deletedAt: null, coordinatorId: null },
    select: { id: true, section: true, academicYear: true },
  })
  if (unassigned.length === 0) console.log('    (none)')
  for (const s of unassigned) console.log(`    ${s.section} (${s.academicYear})`)
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
