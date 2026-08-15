import { ReactNode } from 'react'
import TemplateMain from '@/templates/Main'

export default async function SectionDetailLayout({
  children,
}: {
  children: ReactNode
}) {
  return <TemplateMain padded={false}>{children}</TemplateMain>
}