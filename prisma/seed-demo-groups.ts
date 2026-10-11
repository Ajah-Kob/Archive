import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

type DemoData = {
  sections: { key: string; name: string }[]
  groups: { key: string; name: string; section: string; adviser: string | null }[]
  students: { name: string; email: string; section: string; group: string; isLeader: boolean }[]
}

// Phase 3: student section records + groups + leaders + adviser assignments
// (G1-G4 assigned, G5/G6 open). No chapters or defenses yet. Idempotent.
async function main() {
  const raw = readFileSync(join(__dirname, '..', 'data', 'demo-users.json'), 'utf8')
  const data = JSON.parse(raw) as DemoData

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED! })
  const prisma = new PrismaClient({ adapter })

  const sectionIds = new Map<string, number>()
  for (const s of data.sections) {
    const section = await prisma.section.findFirst({
      where: { section: s.name, deletedAt: null },
    })
    if (!section) throw new Error(`Section missing: ${s.name} (run phase 2 first)`)
    sectionIds.set(s.key, section.id)
  }

  // Students first (section, no group yet) so leader ids exist for groups
  const studentIds = new Map<string, number>()
  for (const s of data.students) {
    const user = await prisma.user.findUnique({ where: { email: s.email } })
    if (!user) throw new Error(`User missing: ${s.email} (run phase 1 first)`)
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: { sectionId: sectionIds.get(s.section)!, groupId: null, deletedAt: null },
      create: { userId: user.id, sectionId: sectionIds.get(s.section)! },
    })
    studentIds.set(s.email, student.id)
  }
  console.log(`✅ Student records: ${studentIds.size}`)

  for (const g of data.groups) {
    const members = data.students.filter((s) => s.group === g.key)
    const leader = members.find((s) => s.isLeader) ?? members[0]
    const leaderId = studentIds.get(leader.email)!

    let group = await prisma.group.findFirst({
      where: { sectionId: sectionIds.get(g.section)!, groupName: g.name, deletedAt: null },
    })
    if (!group) {
      group = await prisma.group.create({
        data: {
          sectionId: sectionIds.get(g.section)!,
          groupName: g.name,
          leaderStudentId: leaderId,
        },
      })
      console.log(`✅ Group: ${g.name} (leader ${leader.email})`)
    } else {
      await prisma.group.update({
        where: { id: group.id },
        data: { leaderStudentId: leaderId, deletedAt: null },
      })
      console.log(`↩ Group exists: ${g.name}`)
    }

    for (const m of members) {
      await prisma.student.update({
        where: { id: studentIds.get(m.email)! },
        data: { groupId: group.id },
      })
    }

    if (g.adviser) {
      const adviserUser = await prisma.user.findUnique({ where: { email: g.adviser } })
      const faculty = adviserUser
        ? await prisma.faculty.findFirst({ where: { userId: adviserUser.id, deletedAt: null } })
        : null
      if (!faculty) throw new Error(`Faculty missing: ${g.adviser}`)
      let adviser = await prisma.adviser.findFirst({ where: { facultyId: faculty.id } })
      if (!adviser) {
        adviser = await prisma.adviser.create({ data: { facultyId: faculty.id } })
      } else if (adviser.deletedAt) {
        await prisma.adviser.update({ where: { id: adviser.id }, data: { deletedAt: null } })
      }
      await prisma.group.update({ where: { id: group.id }, data: { adviserId: adviser.id } })
      console.log(`  → adviser: ${g.adviser}`)
    } else {
      console.log(`  → no adviser (open for live demo)`)
    }
  }

  await prisma.$disconnect()
  console.log('Done: 6 groups, 24 memberships, 4 advisers assigned.')
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})
