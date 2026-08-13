import { ReactNode } from 'react'
import TemplateDashboard from '@/templates/Dashboard'
import { requireCoordinatorAccess } from '@/lib/actions/guard'
import { redirect } from 'next/navigation'

export default async function FacultyLayout({ children }: { children: ReactNode }) {
  const session = await requireCoordinatorAccess()
  if (!session) redirect('/dashboard')

  return <TemplateDashboard>{children}</TemplateDashboard>
}
