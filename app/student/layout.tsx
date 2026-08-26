import { ReactNode } from 'react'
import TemplateMain from '@/templates/Main'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  return <TemplateMain padded={false}>{children}</TemplateMain>
}