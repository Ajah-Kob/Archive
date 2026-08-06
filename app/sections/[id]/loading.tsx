import { StudentTableSkeleton } from '@/components/sections/students/StudentTableSkeleton'

export default function SectionDetailLoading() {
  return (
    <section className="min-h-full flex flex-col gap-3">
      <div className="flex flex-col">
        <div className="flex gap-[6px] items-center h-[18px] mb-4 animate-pulse">
          <div className="h-[12px] w-[60px] rounded bg-[#e8ebf8]" />
          <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
          <div className="h-[12px] w-[50px] rounded bg-[#e8ebf8]" />
          <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
          <div className="h-[12px] w-[80px] rounded bg-[#e8ebf8]" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-[20px] w-[140px] rounded bg-[#e8ebf8] animate-pulse" />
          <div className="h-[30px] w-[118px] rounded-[9px] bg-[#e8ebf8] animate-pulse" />
        </div>
        <div className="h-[14px] w-[420px] rounded bg-[#e8ebf8] animate-pulse mt-2" />
      </div>
      <div className="flex-1 pb-[30px]">
        <StudentTableSkeleton />
      </div>
    </section>
  )
}
