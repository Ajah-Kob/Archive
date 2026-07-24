import { ChevronRight } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { FacultyList } from '@/components/faculty/FacultyList'

export default async function FacultyPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  return (
    <section className="bg-[#f4f6ff] min-h-full flex flex-col gap-3 pt-[30px] px-[30px]">
      <div className="flex gap-[6px] items-center h-[18px]">
        <span className="font-sans font-medium text-[12px] leading-[18px] text-[rgba(16,19,58,0.5)]">
          ARCHIVE
        </span>
        <ChevronRight className="size-3 text-[rgba(16,19,58,0.5)]" />
        <span className="font-sans font-bold text-[12px] leading-[18px] text-[#707dff]">Faculty</span>
      </div>
      <div className="flex flex-col">
        <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
          Adviser Workload
        </h1>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          Monitor BSIS capstone progress, coordinator assignments, adviser workload, and defense outcomes.
        </p>
      </div>
      <div className="flex-1 pb-[30px]">
        <FacultyList />
      </div>
    </section>
  )
}
