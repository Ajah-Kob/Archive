import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcrypt'
import { config } from 'dotenv'
config({ path: '.env.local' })

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const defaultEmail = 'admin@domain.com'
  const passwordHash = await bcrypt.hash('defaultpass', 10)

  const admin = await prisma.user.upsert({
    where: { email: defaultEmail },
    update: {},
    create: {
      name: 'Admin User',
      email: defaultEmail,
      password: passwordHash,
      role: 'SUPERADMIN',
      activatedAt: new Date(),
    },
  })

  console.log('✅ Seeded admin user:', admin.email)

  // ── Sample Templates ──
  const templates = [
    { name: 'Capstone Project Proposal Template', size: 245760 },
    { name: 'Research Paper Format Guide', size: 184320 },
    { name: 'Chapter 1 Submission Form', size: 102400 },
    { name: 'Capstone 2 Manuscript Template', size: 512000 },
    { name: 'APA 7th Edition Citation Guide', size: 307200 },
    { name: 'Panel Evaluation Form', size: 81920 },
    { name: 'System Architecture Diagram Template', size: 409600 },
    { name: 'Data Gathering Instrument Guide', size: 225280 },
    { name: 'Adviser Sign-off Form', size: 65536 },
    { name: 'Oral Defense Presentation Template', size: 1024000 },
    { name: 'Statistical Treatment Guide', size: 196608 },
    { name: 'Ethics Clearance Form', size: 51200 },
  ]

  for (const t of templates) {
    const safeName = t.name.toLowerCase().replace(/\s+/g, '-')
    await prisma.template.create({
      data: {
        name: t.name,
        fileName: `${safeName}.pdf`,
        blobUrl: `https://tosysoik0rjt4ojn.public.blob.vercel-storage.com/user/${admin.id}/${safeName}.pdf`,
        mimeType: 'application/pdf',
        size: t.size,
        uploadedById: admin.id,
      },
    })
  }

  console.log(`✅ Seeded ${templates.length} sample templates`)

  // ── Sample Faculty & Roles ──
  const facultySeed = [
    {
      name: 'Dr. Maria Santos',
      email: 'm.santos@university.edu',
      loggedInAt: new Date(Date.now() - 1 * 60 * 1000),
      role: 'adviser' as const,
    },
    {
      name: 'Prof. Andrea Santos',
      email: 'a.santos@university.edu',
      loggedInAt: new Date(Date.now() - 30 * 60 * 1000),
      role: 'coordinator' as const,
    },
    {
      name: 'Dr. Carlo Reyes',
      email: 'c.reyes@university.edu',
      loggedInAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      role: 'adviser' as const,
    },
    {
      name: 'Prof. Manuel Tan',
      email: 'm.tan@university.edu',
      loggedInAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      role: 'coordinator' as const,
    },
    {
      name: 'Dr. Julia Lim',
      email: 'j.lim@university.edu',
      loggedInAt: new Date(Date.now() - 1 * 60 * 1000),
      role: 'adviser' as const,
    },
    {
      name: 'Dr. Elena Garcia',
      email: 'e.garcia@university.edu',
      loggedInAt: null,
      role: 'none' as const,
    },
  ]

  const advisers: Record<string, number> = {}
  let andreaCoordinatorId = 0

  for (const seed of facultySeed) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        role: 'FACULTY',
        loggedInAt: seed.loggedInAt ?? undefined,
        deletedAt: null,
      },
      create: {
        name: seed.name,
        email: seed.email,
        password: passwordHash,
        role: 'FACULTY',
        activatedAt: new Date(),
        loggedInAt: seed.loggedInAt ?? new Date(),
      },
    })

    let faculty = await prisma.faculty.findFirst({ where: { userId: user.id } })
    if (faculty) {
      if (faculty.deletedAt) {
        faculty = await prisma.faculty.update({
          where: { id: faculty.id },
          data: { deletedAt: null },
        })
      }
    } else {
      faculty = await prisma.faculty.create({ data: { userId: user.id } })
    }

    if (seed.role === 'adviser') {
      let adviser = await prisma.adviser.findFirst({
        where: { facultyId: faculty.id },
      })
      if (!adviser) {
        adviser = await prisma.adviser.create({ data: { facultyId: faculty.id } })
      } else if (adviser.deletedAt) {
        adviser = await prisma.adviser.update({
          where: { id: adviser.id },
          data: { deletedAt: null },
        })
      }
      advisers[seed.name] = adviser.id
    }

    if (seed.role === 'coordinator') {
      let coordinator = await prisma.coordinator.findFirst({
        where: { facultyId: faculty.id },
      })
      if (!coordinator) {
        coordinator = await prisma.coordinator.create({
          data: { facultyId: faculty.id },
        })
      } else if (coordinator.deletedAt) {
        coordinator = await prisma.coordinator.update({
          where: { id: coordinator.id },
          data: { deletedAt: null },
        })
      }
      if (seed.name === 'Prof. Andrea Santos') andreaCoordinatorId = coordinator.id
    }
  }

  // ── Sample Sections (managed by Prof. Andrea Santos) ──
  // Strict format: {year}{section}{group} e.g. 4AG1 → 4th Year, Section A, Group 1
  const sectionSeed = [
    { section: '4AG1', yearLevel: '4th Year' },
    { section: '3AG1', yearLevel: '3rd Year' },
  ]
  const sections: Record<string, number> = {}
  for (const s of sectionSeed) {
    let row = await prisma.section.findFirst({
      where: { section: s.section },
    })
    if (row && row.deletedAt) {
      row = await prisma.section.update({
        where: { id: row.id },
        data: {
          coordinatorId: andreaCoordinatorId,
          yearLevel: s.yearLevel,
          deletedAt: null,
        },
      })
    }
    if (!row) {
      row = await prisma.section.create({
        data: {
          coordinatorId: andreaCoordinatorId,
          section: s.section,
          yearLevel: s.yearLevel,
        },
      })
    } else if (row.coordinatorId !== andreaCoordinatorId) {
      row = await prisma.section.update({
        where: { id: row.id },
        data: { coordinatorId: andreaCoordinatorId },
      })
    }

    let joinCode = row.joinCodeId
      ? await prisma.joinCode.findUnique({ where: { id: row.joinCodeId } })
      : null
    if (!joinCode || joinCode.deletedAt || joinCode.expiresAt < new Date()) {
      joinCode = await prisma.joinCode.create({
        data: {
          code: `SEC${row.section}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          type: 'STUDENT',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      })
      await prisma.section.update({
        where: { id: row.id },
        data: { joinCodeId: joinCode.id },
      })
    }

    sections[s.section] = row.id
  }

  // Soft-delete any other sections assigned to this coordinator so reseeding
  // keeps the sample dataset exactly at the two canonical sections.
  await prisma.section.updateMany({
    where: {
      coordinatorId: andreaCoordinatorId,
      deletedAt: null,
      NOT: { section: { in: ['4AG1', '3AG1'] } },
    },
    data: { deletedAt: new Date() },
  })

  // ── Sample Students ──
  const studentSeed = [
    { name: 'Juan Dela Cruz', email: 'j.delacruz@university.edu' },
    { name: 'Maria Clara', email: 'm.clara@university.edu' },
    { name: 'Jose Rizal', email: 'j.rizal@university.edu' },
    { name: 'Andres Bonifacio', email: 'a.bonifacio@university.edu' },
  ]
  const studentIds: number[] = []
  for (const s of studentSeed) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { role: 'STUDENT', deletedAt: null },
      create: {
        name: s.name,
        email: s.email,
        password: passwordHash,
        role: 'STUDENT',
        activatedAt: new Date(),
      },
    })
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: { sectionId: sections['4AG1'], deletedAt: null },
      create: { userId: user.id, sectionId: sections['4AG1'] },
    })
    studentIds.push(student.id)
  }

  // ── Sample Groups, Topics & Capstones ──
  const groupSeed = [
    {
      groupName: 'Team Delta',
      members: [0, 1],
      adviserName: 'Dr. Maria Santos',
      topic:
        'AI-Driven Document Archiving System for Local Government Records',
    },
    {
      groupName: 'Team Epsilon',
      members: [2, 3],
      adviserName: 'Dr. Maria Santos',
      topic: 'Smart Attendance Monitoring System using Facial Recognition',
    },
  ]

  for (const g of groupSeed) {
    let group = await prisma.group.findFirst({
      where: { groupName: g.groupName },
    })
    if (group && group.deletedAt) {
      group = await prisma.group.update({
        where: { id: group.id },
        data: { sectionId: sections['4AG1'], deletedAt: null },
      })
    }
    if (!group) {
      group = await prisma.group.create({
        data: { groupName: g.groupName, sectionId: sections['4AG1'] },
      })
    }

    for (const idx of g.members) {
      await prisma.student.update({
        where: { id: studentIds[idx] },
        data: { groupId: group.id },
      })
    }

    let topic = await prisma.topic.findFirst({ where: { groupId: group.id } })
    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          groupId: group.id,
          title: g.topic,
          background: g.topic,
          status: 'APPROVED',
          uploadedById: studentIds[g.members[0]],
        },
      })
    }

    const capstone = await prisma.capstone.findFirst({
      where: { groupId: group.id },
    })
    if (!capstone) {
      await prisma.capstone.create({
        data: {
          groupId: group.id,
          topicId: topic.id,
          adviserId: advisers[g.adviserName],
        },
      })
    }
  }

  console.log('✅ Seeded sample faculty, coordinators, advisers and capstone groups')
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
