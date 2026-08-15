import { ReactNode } from 'react'
import TemplateMain from '@/templates/Main'

export default async function AccountLayout({ children }: { children: ReactNode }) {
  return <TemplateMain>{children}</TemplateMain>
}