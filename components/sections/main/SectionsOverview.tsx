import type { ReactNode } from 'react'
import { SectionTable } from '@/components/sections/main/SectionTable'
import { getSections } from '@/lib/actions/sections'

export default async function SectionsOverview({
  actions,
}: {
  /** Optional toolbar actions rendered in the card header. */
  actions?: ReactNode
}) {
  const sectionsRes = await getSections()
  const sections =
    sectionsRes.success && sectionsRes.payload ? sectionsRes.payload : []

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <SectionTable sections={sections} actions={actions} />
    </div>
  )
}
