import TemplateMain from '@/templates/Main'
import { redirect } from 'next/navigation'
import { requireCoordinatorAccess } from '@/lib/actions/guard'

export default async function TemplatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!(await requireCoordinatorAccess())) redirect('/dashboard')

  return <TemplateMain>{children}</TemplateMain>
}
