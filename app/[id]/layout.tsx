import { ReactNode } from 'react'
import TemplateMain from '@/templates/Main'
import { redirect } from 'next/navigation'
import { requireCoordinator } from '@/lib/actions/guard'

export default async function SectionLayout({ children }: { children: ReactNode }) {
  if (!(await requireCoordinator())) redirect('/dashboard')

  return <TemplateMain padded={false}>{children}</TemplateMain>
}