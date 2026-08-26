import { compare } from 'bcrypt'
import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 1 * 24 * 60 * 60, // 1 day
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Signin',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'hello@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials.password) {
          return null
        }

        const user = await prisma.user.findFirst({
          where: {
            deletedAt: null,
            email: credentials.email,
          },
        })

        // Not found
        if (!user) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password + ''
        )

        if (!isPasswordValid) {
          return null
        }

        await prisma.user.update({
          where: {
            email: credentials.email,
          },
          data: {
            loggedInAt: new Date().toISOString(),
          },
        })

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }

      // Always re-read the authoritative record from the DB so role changes
      // (e.g. a coordinator being removed) are picked up on the next session
      // poll without waiting for a re-login.
      if (token.id) {
        const dbUser = await prisma.user.findFirst({
          where: { id: +(token.id as string), deletedAt: null },
          include: {
            faculty: { include: { coordinator: true, adviser: true } },
            student: true,
          },
        })
        if (dbUser) {
          token.name = dbUser.name
          token.email = dbUser.email
          token.image = dbUser.image
          token.role = dbUser.role
          token.isProgramChair = dbUser.faculty?.isProgramChair ?? false
          token.isFaculty = !!dbUser.faculty && dbUser.faculty.deletedAt === null
          token.isStudent = !!dbUser.student && dbUser.student.deletedAt === null
          // Relation includes don't respect soft-deletes — check deletedAt
          // explicitly so a removed coordinator loses their access flags.
          const coordinator = dbUser.faculty?.coordinator
          token.isCoordinator = !!coordinator && coordinator.deletedAt === null
          const adviser = dbUser.faculty?.adviser
          token.isAdviser = !!adviser && adviser.deletedAt === null
        }
      }

      return token
    },
    async session({ session, token }) {
      // Custom sessions
      session.user.id = token.id as string
      session.user.name = token.name as string
      session.user.email = token.email as string
      session.user.image = token.image as string
      session.user.role = token.role as string
      session.user.isProgramChair = token.isProgramChair as boolean
      session.user.isFaculty = token.isFaculty as boolean
      session.user.isStudent = token.isStudent as boolean
      session.user.isCoordinator = token.isCoordinator as boolean
      session.user.isAdviser = token.isAdviser as boolean

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
