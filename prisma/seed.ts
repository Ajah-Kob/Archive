import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcrypt'
import { config } from 'dotenv'
import defaultUsers from '../data/default-user'
import { AVATAR_GRADIENTS } from '../lib/gradients'
config({ path: '.env.local' })

function pickRandomGradient(): string {
  return AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)]!
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('defaultpass', 10)

  for (const seed of defaultUsers) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        name: seed.name,
        role: seed.role,
        deletedAt: null,
      },
      create: {
        name: seed.name,
        email: seed.email,
        password: passwordHash,
        role: seed.role,
        avatarGradient: pickRandomGradient(),
        activatedAt: new Date(),
      },
    })

    if (seed.role === 'FACULTY') {
      let faculty = await prisma.faculty.findFirst({ where: { userId: user.id } })
      if (faculty && faculty.deletedAt) {
        faculty = await prisma.faculty.update({
          where: { id: faculty.id },
          data: { deletedAt: null },
        })
      }
      if (!faculty) {
        faculty = await prisma.faculty.create({
          data: { userId: user.id, isProgramChair: seed.isProgramChair ?? false },
        })
      } else if (
        seed.isProgramChair !== undefined &&
        faculty.isProgramChair !== seed.isProgramChair
      ) {
        faculty = await prisma.faculty.update({
          where: { id: faculty.id },
          data: { isProgramChair: seed.isProgramChair },
        })
      }

      if (seed.isCoordinator) {
        let coordinator = await prisma.coordinator.findFirst({
          where: { facultyId: faculty.id },
        })
        if (coordinator && coordinator.deletedAt) {
          await prisma.coordinator.update({
            where: { id: coordinator.id },
            data: { deletedAt: null },
          })
        } else if (!coordinator) {
          await prisma.coordinator.create({ data: { facultyId: faculty.id } })
        }
      }
    }

    console.log(`✅ Seeded ${seed.role}:`, seed.email)
  }

  await seedDefenseResubmissions(passwordHash)
}

// Seeds a minimal defense-submission chain so the faculty Resubmissions tab
// has real data to display: two panelists, a section, a group, a defense
// schedule with a revision verdict, and a resubmission (DefenseSubmission)
// with per-panelist reviews. Idempotent — safe to run repeatedly.
async function seedDefenseResubmissions(passwordHash: string) {
  // 1. Ensure two faculty panelists exist.
  const panelistDefs = [
    { email: 'panelist1@domain.com', name: 'Panelist One' },
    { email: 'panelist2@domain.com', name: 'Panelist Two' },
  ]
  const panelists: { id: number }[] = []
  for (const def of panelistDefs) {
    let user = await prisma.user.findUnique({ where: { email: def.email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: def.name,
          email: def.email,
          password: passwordHash,
          role: 'FACULTY',
          avatarGradient: pickRandomGradient(),
          activatedAt: new Date(),
        },
      })
      await prisma.faculty.create({ data: { userId: user.id } })
    }
    panelists.push({ id: user.id })
  }

  // 2. Ensure a coordinator exists (reuse the seeded coordinator).
  const coordinatorUser = await prisma.user.findUnique({
    where: { email: 'coordinator@domain.com' },
  })
  if (!coordinatorUser) {
    console.log('⚠️ Skipping defense resubmission seed: coordinator not found.')
    return
  }
  const coordinator = await prisma.coordinator.findFirst({
    where: { faculty: { userId: coordinatorUser.id } },
  })
  if (!coordinator) {
    console.log('⚠️ Skipping defense resubmission seed: coordinator record not found.')
    return
  }

  // 3. Ensure a section exists.
  const sectionName = 'BSIS 4A'
  let section = await prisma.section.findFirst({
    where: { coordinatorId: coordinator.id, section: sectionName },
  })
  if (!section) {
    section = await prisma.section.create({
      data: { coordinatorId: coordinator.id, section: sectionName },
    })
  }

  // 4. Ensure a group exists in the section.
  const groupName = 'Group 12'
  let group = await prisma.group.findFirst({
    where: { sectionId: section.id, groupName },
  })
  if (!group) {
    group = await prisma.group.create({
      data: { sectionId: section.id, groupName },
    })
  }

  // 5. Ensure a defense schedule with a revision verdict exists.
  let schedule = await prisma.defenseSchedule.findFirst({
    where: { groupId: group.id, deletedAt: null },
  })
  if (!schedule) {
    schedule = await prisma.defenseSchedule.create({
      data: {
        groupId: group.id,
        type: 'PROPOSAL',
        date: new Date('2026-08-28T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '10:00',
        venue: 'Room 201',
        verdict: 'MINOR_REVISION',
        createdBy: coordinatorUser.id,
        panelists: {
          create: panelists.map((p, i) => ({
            userId: p.id,
            role: i === 0 ? 'CHAIR' : 'PANEL_MEMBER',
          })),
        },
      },
    })
  }

  // 6. Ensure a resubmission exists with a PENDING review for each panelist.
  const existingResubmission = await prisma.defenseSubmission.findFirst({
    where: { scheduleId: schedule.id, deletedAt: null },
  })
  if (!existingResubmission) {
    const resubmission = await prisma.defenseSubmission.create({
      data: {
        scheduleId: schedule.id,
        isInitial: false,
        version: 2,
        submittedBy: coordinatorUser.id,
        fileName: 'Proposal_Manuscript_v2.pdf',
        blobUrl: 'https://example.com/proposal-v2.pdf',
        mimeType: 'application/pdf',
        size: 2457600,
        reviews: {
          create: panelists.map((p) => ({
            panelistId: p.id,
            status: 'PENDING',
          })),
        },
      },
    })
    console.log('✅ Seeded defense submission:', resubmission.id)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
