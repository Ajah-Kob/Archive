import { ReactNode } from 'react'
import TemplateMain from '@/templates/Main'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'

export default async function CoordinatorLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  return <TemplateMain>{children}</TemplateMain>
}
