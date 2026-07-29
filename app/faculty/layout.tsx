import { ReactNode } from 'react'
import TemplateDashboard from '@/templates/Dashboard'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'

export default async function FacultyLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  return <TemplateDashboard>{children}</TemplateDashboard>
}
