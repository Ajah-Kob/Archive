import TemplateMain from '@/templates/Main'

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <TemplateMain>{children}</TemplateMain>
}
