import { notFound } from 'next/navigation'
import { PageLabel } from '@/components/globals/PageLabel'
import { SectionTabs } from '@/components/my-sections/SectionTabs'
import { getCoordinatorSectionById } from '@/lib/actions/sections'

export default async function MySectionLayout({
  params,
  children,
}: {
  params: Promise<{ sectionId: string }>
  children: React.ReactNode
}) {
  const { sectionId } = await params
  const res = await getCoordinatorSectionById(parseInt(sectionId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  const { section } = payload

  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label={section.name} />
      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <SectionTabs sectionId={sectionId}>
          {children}
        </SectionTabs>
      </div>
    </section>
  )
}
