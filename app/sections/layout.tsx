import { ReactNode } from 'react'
import TemplateMain from '@/templates/Main'
import { redirect } from 'next/navigation'
import { requireAdminOrProgramChair } from '@/lib/actions/guard'

export default async function SectionsLayout({ children }: { children: ReactNode }) {
  if (!(await requireAdminOrProgramChair())) redirect('/dashboard')

  return <TemplateMain>{children}</TemplateMain>
}
