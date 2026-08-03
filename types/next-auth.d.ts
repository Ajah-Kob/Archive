import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role?: string | null
      image?: string | null
      isProgramChair?: boolean
      isFaculty?: boolean
      isStudent?: boolean
      isCoordinator?: boolean
    }
  }

  interface User {
    id: string
    role?: string
    image?: string
  }

  interface JWT {
    id: string
    role?: string
    image?: string
    isProgramChair?: boolean
    isFaculty?: boolean
    isStudent?: boolean
    isCoordinator?: boolean
  }
}
