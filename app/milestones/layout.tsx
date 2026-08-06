import { ReactNode } from 'react'
import TemplateMain from '@/templates/Main'
import { redirect } from 'next/navigation'
import { requireStudent } from '@/lib/actions/guard'

export default async function MilestonesLayout({ children }: { children: ReactNode }) {
  if (!(await requireStudent())) redirect('/dashboard')

  return <TemplateMain padded={false}>{children}</TemplateMain>
}
