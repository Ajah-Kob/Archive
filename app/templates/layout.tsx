import TemplateMain from '@/templates/Main'

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <TemplateMain>{children}</TemplateMain>
}
