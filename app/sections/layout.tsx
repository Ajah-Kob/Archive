import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireCoordinatorAccess } from '@/lib/actions/guard'

export default async function SectionsLayout({ children }: { children: ReactNode }) {
  if (!(await requireCoordinatorAccess())) redirect('/dashboard')

  return <>{children}</>
}