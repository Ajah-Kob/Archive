import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcrypt'
import { config } from 'dotenv'
config({ path: '.env.local' })

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
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
