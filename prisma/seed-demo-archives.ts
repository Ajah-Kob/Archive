import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { put } from '@vercel/blob'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

type SeedRow = {
  title: string
  abstract: string
  tags: string[]
  authors: { firstName: string; lastName: string; email: string }[]
  publishedAt?: string
}

const ROWS: SeedRow[] = [
  {
    title:
      'Development of an Online Capstone Monitoring System for Information Systems Students in Philippine State Universities',
    abstract:
      'This study developed a web-based platform that tracks capstone milestones, adviser feedback, and defense readiness across the academic lifecycle. Evaluated with BSIS students and faculty, the system improved milestone visibility and reduced reliance on manual coordination through Messenger and spreadsheets.',
    tags: [
      'capstone',
      'monitoring system',
      'information systems',
      'web application',
      'academic management',
      'student progress',
      'adviser workflow',
      'higher education',
      'Philippines',
      'research management',
    ],
    authors: [
      { firstName: 'Josefa', lastName: 'Reyes', email: 'josefa.reyes@bulsu.edu.ph' },
      { firstName: 'Marco', lastName: 'Santos', email: 'marco.santos@bulsu.edu.ph' },
      { firstName: 'Ana Lucia', lastName: 'Torres', email: 'ana.torres@bulsu.edu.ph' },
      { firstName: 'Rafael', lastName: 'Mendoza', email: 'rafael.mendoza@bulsu.edu.ph' },
    ],
  },
  {
    title:
      'A Machine Learning Based Early Warning System for Predicting Student Academic Performance and Dropout Risks',
    abstract:
      'This research built an early warning system that analyzes grades, attendance, and activity logs to flag at-risk students before final examinations. Classification models trained on three semesters of institutional data achieved actionable precision, giving advisers time to intervene with targeted support.',
    tags: [
      'machine learning',
      'early warning system',
      'academic performance',
      'dropout prediction',
      'educational data mining',
      'student analytics',
      'classification',
      'Python',
      'higher education',
      'intervention',
    ],
    authors: [
      { firstName: 'Katrina', lastName: 'Villanueva', email: 'katrina.villanueva@bulsu.edu.ph' },
      { firstName: 'Dennis', lastName: 'Ocampo', email: 'dennis.ocampo@bulsu.edu.ph' },
      { firstName: 'Sheena', lastName: 'Castillo', email: 'sheena.castillo@bulsu.edu.ph' },
      { firstName: 'Paolo', lastName: 'Rivera', email: 'paolo.rivera@bulsu.edu.ph' },
      { firstName: 'Bianca', lastName: 'Flores', email: 'bianca.flores@bulsu.edu.ph' },
    ],
  },
  {
    title:
      'Design and Implementation of a Barangay Health Records Management Platform with SMS Notification Services',
    abstract:
      'This project digitized patient records, immunization logs, and appointment schedules for a partner barangay health center. SMS reminders reduced missed checkups during the pilot quarter, and health workers reported faster retrieval of resident histories compared to paper ledgers.',
    tags: [
      'barangay',
      'health records',
      'management platform',
      'SMS notification',
      'public health',
      'web system',
      'patient records',
      'community health',
      'e-governance',
      'Philippines',
    ],
    authors: [
      { firstName: 'Clarissa', lastName: 'Domingo', email: 'clarissa.domingo@bulsu.edu.ph' },
      { firstName: 'Jerome', lastName: 'Salazar', email: 'jerome.salazar@bulsu.edu.ph' },
      { firstName: 'Divina', lastName: 'Mercado', email: 'divina.mercado@bulsu.edu.ph' },
      { firstName: 'Alvin', lastName: 'Cortez', email: 'alvin.cortez@bulsu.edu.ph' },
    ],
  },
  {
    title:
      'Web Based Document Approval Workflow with Digital Signatures for Streamlining Lengthy University Administrative Transaction Processes',
    abstract:
      'This capstone replaced paper routing slips with a browser-based approval chain featuring role-based steps and digital signatures. Pilot offices processed memoranda and purchase requests measurably faster, with full audit trails available for every transaction.',
    tags: [
      'document approval',
      'workflow',
      'digital signature',
      'university administration',
      'paperless',
      'business process',
      'web application',
      'records management',
      'efficiency',
      'e-governance',
    ],
    authors: [
      { firstName: 'Vanessa', lastName: 'Aguilar', email: 'vanessa.aguilar@bulsu.edu.ph' },
      { firstName: 'Christian', lastName: 'Bautista', email: 'christian.bautista@bulsu.edu.ph' },
      { firstName: 'Diana', lastName: 'Gonzales', email: 'diana.gonzales@bulsu.edu.ph' },
      { firstName: 'Felix', lastName: 'Padilla', email: 'felix.padilla@bulsu.edu.ph' },
      { firstName: 'Gloria', lastName: 'Morales', email: 'gloria.morales@bulsu.edu.ph' },
    ],
  },
  {
    title:
      'Development of Mobile Assisted E Learning Application for Improving Programming Skills Among First Year Students',
    abstract:
      'This study created an Android companion app with bite-sized coding drills, instant feedback, and gamified progress for introductory programming classes. First-year students using the app across one semester showed stronger lab performance than sections taught with lectures alone.',
    tags: [
      'mobile learning',
      'e-learning',
      'programming education',
      'first year students',
      'android application',
      'coding skills',
      'computer science',
      'interactive learning',
      'assessment',
      'Philippines',
    ],
    authors: [
      { firstName: 'Hannah', lastName: 'Romero', email: 'hannah.romero@bulsu.edu.ph' },
      { firstName: 'Ivan', lastName: 'Santiago', email: 'ivan.santiago@bulsu.edu.ph' },
      { firstName: 'Jenny', lastName: 'Fernandez', email: 'jenny.fernandez@bulsu.edu.ph' },
      { firstName: 'Kevin', lastName: 'Dela Pena', email: 'kevin.delapena@bulsu.edu.ph' },
    ],
  },
  {
    title:
      'Implementation of a QR Code Based Attendance Tracking System for Lecture Classes in State Universities',
    abstract:
      'This research deployed QR-based attendance checking across large lecture sections, replacing manual roll calls that consumed class hours. Faculty recorded presence in seconds per session, and the generated reports supported grade computation at term end.',
    tags: [
      'QR code',
      'attendance tracking',
      'lecture classes',
      'state universities',
      'automation',
      'student records',
      'web application',
      'classroom management',
      'efficiency',
      'Philippines',
    ],
    authors: [
      { firstName: 'Lorna', lastName: 'Bautista', email: 'lorna.bautista@bulsu.edu.ph' },
      { firstName: 'Mario', lastName: 'Aquino', email: 'mario.aquino@bulsu.edu.ph' },
      { firstName: 'Nadia', lastName: 'Ramos', email: 'nadia.ramos@bulsu.edu.ph' },
      { firstName: 'Oscar', lastName: 'Lim', email: 'oscar.lim@bulsu.edu.ph' },
    ],
    publishedAt: '2025-03-14T00:00:00.000Z',
  },
  {
    title:
      'Development of an Online Job Portal Connecting Senior Students with Local Employers and Industry Partners',
    abstract:
      'This project launched a job matching portal where graduating students publish profiles and nearby employers post openings suited to degree programs. The pilot semester produced internship placements for participating seniors and a waiting list of partner companies.',
    tags: [
      'job portal',
      'employment',
      'senior students',
      'industry partners',
      'web platform',
      'internship',
      'career services',
      'job matching',
      'local employers',
      'Philippines',
    ],
    authors: [
      { firstName: 'Pamela', lastName: 'Cruz', email: 'pamela.cruz@bulsu.edu.ph' },
      { firstName: 'Quincy', lastName: 'Garcia', email: 'quincy.garcia@bulsu.edu.ph' },
      { firstName: 'Rhea', lastName: 'Navarro', email: 'rhea.navarro@bulsu.edu.ph' },
      { firstName: 'Sonny', lastName: 'Villanueva', email: 'sonny.villanueva@bulsu.edu.ph' },
      { firstName: 'Tricia', lastName: 'Mendoza', email: 'tricia.mendoza@bulsu.edu.ph' },
    ],
    publishedAt: '2025-04-02T00:00:00.000Z',
  },
  {
    title:
      'Design of Flood Monitoring and Early Warning Device Using Water Level Sensors and GSM Communication',
    abstract:
      'This study prototyped a low-cost river monitoring device combining ultrasonic water level sensors with GSM alerts to riverside communities. Field tests along a flood-prone waterway delivered warnings hours ahead of critical levels during monsoon rains.',
    tags: [
      'flood monitoring',
      'early warning',
      'water level sensors',
      'GSM',
      'internet of things',
      'disaster preparedness',
      'embedded system',
      'community safety',
      'Philippines',
      'prototype',
    ],
    authors: [
      { firstName: 'Ursula', lastName: 'Torres', email: 'ursula.torres@bulsu.edu.ph' },
      { firstName: 'Victor', lastName: 'Santos', email: 'victor.santos@bulsu.edu.ph' },
      { firstName: 'Wendy', lastName: 'Reyes', email: 'wendy.reyes@bulsu.edu.ph' },
      { firstName: 'Xander', lastName: 'Flores', email: 'xander.flores@bulsu.edu.ph' },
    ],
    publishedAt: '2025-04-21T00:00:00.000Z',
  },
  {
    title:
      'Creation of Interactive Virtual Campus Tour with Panoramic Views for Prospective Freshmen and Their Parents',
    abstract:
      'This capstone produced a browser-based virtual tour stitching panoramic photography of campus buildings with guided routes and program information. Admission officers used it during enrollment caravans for applicants unable to visit in person.',
    tags: [
      'virtual tour',
      'campus',
      'panoramic views',
      'freshmen',
      'admissions',
      'interactive media',
      'web application',
      'school marketing',
      'Philippines',
      'photography',
    ],
    authors: [
      { firstName: 'Yolanda', lastName: 'Castillo', email: 'yolanda.castillo@bulsu.edu.ph' },
      { firstName: 'Zandro', lastName: 'Morales', email: 'zandro.morales@bulsu.edu.ph' },
      { firstName: 'Aira', lastName: 'Padilla', email: 'aira.padilla@bulsu.edu.ph' },
      { firstName: 'Bryan', lastName: 'Salazar', email: 'bryan.salazar@bulsu.edu.ph' },
      { firstName: 'Cora', lastName: 'Aguilar', email: 'cora.aguilar@bulsu.edu.ph' },
    ],
    publishedAt: '2025-05-09T00:00:00.000Z',
  },
  {
    title:
      'Evaluation of Cashless Canteen Payment System Using RFID Cards for Faster Student Meal Transactions Daily',
    abstract:
      'This research evaluated an RFID-based cashless payment setup in the university canteen, measuring queue times and reconciliation accuracy against cash handling. Daily transaction logs showed shorter lunch lines and fewer cash discrepancies across the trial month.',
    tags: [
      'cashless payment',
      'RFID',
      'canteen',
      'student meals',
      'transaction system',
      'queue management',
      'smart campus',
      'evaluation',
      'Philippines',
      'automation',
    ],
    authors: [
      { firstName: 'Dario', lastName: 'Fernandez', email: 'dario.fernandez@bulsu.edu.ph' },
      { firstName: 'Elsa', lastName: 'Domingo', email: 'elsa.domingo@bulsu.edu.ph' },
      { firstName: 'Franco', lastName: 'Romero', email: 'franco.romero@bulsu.edu.ph' },
      { firstName: 'Gina', lastName: 'Santiago', email: 'gina.santiago@bulsu.edu.ph' },
    ],
    publishedAt: '2025-05-28T00:00:00.000Z',
  },
]

// Phase 4a: standalone repository entries (groupId null) from Sample File.pdf.
// Skips titles already archived. Uploads one blob per row under archives/.
async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED! })
  const prisma = new PrismaClient({ adapter })

  const superadmin = await prisma.user.findUnique({ where: { email: 'superadmin@domain.com' } })
  if (!superadmin) throw new Error('Superadmin missing — seed it first')

  const fileBuffer = readFileSync(join(__dirname, '..', 'Sample File.pdf'))
  console.log(`Sample file: ${fileBuffer.length} bytes`)

  for (const [i, row] of ROWS.entries()) {
    const existing = await prisma.capstoneArchive.findFirst({
      where: { title: row.title, deletedAt: null },
    })
    if (existing) {
      console.log(`↩ Exists: ${row.title.slice(0, 40)}…`)
      continue
    }
    const blob = await put(`archives/demo-archive-${i + 1}.pdf`, fileBuffer, {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: true,
    })
    await prisma.capstoneArchive.create({
      data: {
        groupId: null,
        title: row.title,
        abstract: row.abstract,
        datePublished: row.publishedAt ? new Date(row.publishedAt) : new Date(),
        fileName: 'Sample File.pdf',
        blobUrl: blob.url,
        mimeType: 'application/pdf',
        size: fileBuffer.length,
        uploadedById: superadmin.id,
        tags: row.tags,
        authorOrder: row.authors.map((a, idx) => ({
          id: `demo-${i + 1}-${idx + 1}`,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          userId: null,
        })),
      },
    })
    console.log(`✅ Archived: ${row.title.slice(0, 50)}… (${row.authors.length} authors)`)
  }

  await prisma.$disconnect()
  console.log('Done: 5 standalone archives.')
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})
