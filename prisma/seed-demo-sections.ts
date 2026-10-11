import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const JOIN_CODE_TTL_MS = 3 * 24 * 60 * 60 * 1000

function generateJoinCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return code
}

type DemoData = {
  sections: { key: string; name: string; academicYear: string }[]
  faculty: { email: string; coordinatorOf: string | null }[]
}

// Phase 2: sections with live STUDENT join codes, coordinators assigned per
// coordinatorOf. No students, no groups yet. Idempotent by section name.
async function main() {
  const raw = readFileSync(join(__dirname, '..', 'data', 'demo-users.json'), 'utf8')
  const data = JSON.parse(raw) as DemoData

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED! })
  const prisma = new PrismaClient({ adapter })

  for (const s of data.sections) {
    let section = await prisma.section.findFirst({
      where: { section: s.name, academicYear: s.academicYear, deletedAt: null },
      include: { joinCode: true },
    })
    if (!section) {
      const joinCode = await prisma.joinCode.create({
        data: {
          code: generateJoinCode(),
          type: 'STUDENT',
          expiresAt: new Date(Date.now() + JOIN_CODE_TTL_MS),
        },
      })
      section = await prisma.section.create({
        data: {
          section: s.name,
          academicYear: s.academicYear,
          coordinatorId: null,
          headerColor: null,
          joinCodeId: joinCode.id,
        },
        include: { joinCode: true },
      })
      console.log(`✅ Section: ${s.name} (code ${(section as any).joinCode.code})`)
    } else {
      console.log(`↩ Section exists: ${s.name}`)
    }

    const owner = data.faculty.find((f) => f.coordinatorOf === s.key)
    if (owner) {
      const user = await prisma.user.findUnique({ where: { email: owner.email } })
      const faculty = user
        ? await prisma.faculty.findFirst({ where: { userId: user.id, deletedAt: null } })
        : null
      const coordinator = faculty
        ? await prisma.coordinator.findFirst({ where: { facultyId: faculty.id, deletedAt: null } })
        : null
      if (coordinator && section.coordinatorId !== coordinator.id) {
        await prisma.section.update({
          where: { id: section.id },
          data: { coordinatorId: coordinator.id },
        })
        console.log(`  → coordinator: ${owner.email}`)
      }
    }
  }

  await prisma.$disconnect()
  console.log('Done: 2 sections with coordinators, no students yet.')
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})
