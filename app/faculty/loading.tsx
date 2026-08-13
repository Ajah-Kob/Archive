import { FacultyTableSkeleton } from '@/components/faculty/FacultyTableSkeleton'

export default function FacultyLoading() {
  return (
    <section className="bg-[#f4f6ff] min-h-full flex flex-col gap-3 pt-[30px] px-[30px]">
      <div className="flex gap-[6px] items-center h-[18px] animate-pulse">
        <div className="h-[12px] w-[60px] rounded bg-[#e8ebf8]" />
        <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
        <div className="h-[12px] w-[50px] rounded bg-[#e8ebf8]" />
      </div>
      <div className="flex flex-col gap-2 animate-pulse">
        <div className="h-[20px] w-[120px] rounded bg-[#e8ebf8]" />
        <div className="h-[14px] w-[420px] rounded bg-[#e8ebf8]" />
      </div>
      <div className="flex-1 pb-[30px]">
        <FacultyTableSkeleton />
      </div>
    </section>
  )
}
