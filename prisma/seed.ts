import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcrypt'
import { config } from 'dotenv'
import defaultUsers from '../data/default-user'
config({ path: '.env.local' })

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
