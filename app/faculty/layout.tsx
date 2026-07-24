import { ReactNode } from 'react'
import TemplateDashboard from '@/templates/Dashboard'

export default function FacultyLayout({ children }: { children: ReactNode }) {
  return <TemplateDashboard>{children}</TemplateDashboard>
}
