import { ReactNode } from 'react'
import TemplateWelcome from '@/templates/Welcome'

export default async function GuestLayout({ children }: { children: ReactNode }) {
  return <TemplateWelcome>{children}</TemplateWelcome>
}