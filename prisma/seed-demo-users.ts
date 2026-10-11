import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcrypt'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

type DemoData = {
  faculty: {
    name: string
    email: string
    honorific: string
    isCoordinator: boolean
    isProgramChair: boolean
  }[]
  students: { name: string; email: string }[]
}

// Phase 1: bare users only. Faculty get Faculty rows (honorific, never chair —
// chair is assigned live) plus Coordinator rows where flagged. Students get
// User rows with role STUDENT and no Student record yet — they join a section
// through the app. No sections, no groups. Idempotent by email.
async function main() {
  const raw = readFileSync(join(__dirname, '..', 'data', 'demo-users.json'), 'utf8')
  const data = JSON.parse(raw) as DemoData
  const passwordHash = await bcrypt.hash('defaultpass', 10)

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED! })
  const prisma = new PrismaClient({ adapter })

  let facultyCount = 0
  for (const f of data.faculty) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: { name: f.name, role: 'FACULTY', deletedAt: null },
      create: {
        name: f.name,
        email: f.email,
        password: passwordHash,
        role: 'FACULTY',
        avatarGradient: 'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
      },
    })

    let faculty = await prisma.faculty.findFirst({ where: { userId: user.id } })
    if (!faculty) {
      faculty = await prisma.faculty.create({
        data: { userId: user.id, honorific: f.honorific, isProgramChair: false },
      })
    } else {
      await prisma.faculty.update({
        where: { id: faculty.id },
        data: { honorific: f.honorific, deletedAt: null },
      })
    }

    if (f.isCoordinator) {
      const existing = await prisma.coordinator.findFirst({
        where: { facultyId: faculty.id, deletedAt: null },
      })
      if (!existing) {
        await prisma.coordinator.create({ data: { facultyId: faculty.id } })
      }
    }
    facultyCount += 1
    console.log(`✅ Faculty: ${f.honorific} ${f.name}`)
  }

  let studentCount = 0
  for (const s of data.students) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, role: 'STUDENT', deletedAt: null },
      create: {
        name: s.name,
        email: s.email,
        password: passwordHash,
        role: 'STUDENT',
        avatarGradient: 'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
      },
    })
    studentCount += 1
  }
  console.log(`✅ Students: ${studentCount} bare users (no sections yet)`)

  console.log(`Done: ${facultyCount} faculty + ${studentCount} students. No chair assigned.`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})
