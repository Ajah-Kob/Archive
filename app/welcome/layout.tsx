import { Metadata } from 'next'
import { ReactNode } from 'react'
import TemplateWelcome from '@/templates/Welcome'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Welcome to Archive',
}

export default async function WelcomeLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  if (session.user.isFaculty || session.user.isStudent) redirect('/dashboard')

  return <TemplateWelcome>{children}</TemplateWelcome>
}
