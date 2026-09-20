import { PageLabel } from '@/components/globals/PageLabel'
import { FacultiesTabs } from '@/components/faculty/FacultiesTabs'
import { MembersList } from '@/components/faculty/MembersList'

export default async function FacultyMembersPage() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Members" />
      <FacultiesTabs />
      <MembersList />
    </section>
  )
}
