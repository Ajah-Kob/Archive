import { PageLabel } from '@/components/globals/PageLabel'
import { FacultyList } from '@/components/faculty/FacultyList'

export default async function FacultyListPage() {
  return (
    <section className="min-h-full flex flex-col pt-[30px] px-[30px] pb-[30px]">
      <PageLabel label="Faculty" />

      <div className="flex flex-col">
        <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
          Faculty
        </h1>
        <p className="font-sans font-medium text-[13.5px] text-[#8a93b4] mt-1">
          Monitor faculty adviser workload to help avoid overloading advisers with capstone groups.
        </p>
      </div>

      <div className="flex-1 pb-[30px] mt-3">
        <FacultyList />
      </div>
    </section>
  )
}