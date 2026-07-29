import TableSkeleton from '@/components/templates/main/TableSkeleton'

export default function TemplatesLoading() {
  return (
    <div className="flex flex-col w-full gap-5 h-full animate-pulse">
      <div className="flex flex-col gap-[12px]">
        <div className="flex items-center gap-2">
          <div className="h-[12px] w-[60px] rounded bg-[#e8ebf8]" />
          <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
          <div className="h-[12px] w-[80px] rounded bg-[#e8ebf8]" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-[20px] w-[200px] rounded bg-[#e8ebf8]" />
            <div className="h-[14px] w-[280px] rounded bg-[#e8ebf8]" />
          </div>
          <div className="h-[38px] w-[145px] rounded-xl bg-[#e8ebf8]" />
        </div>
      </div>

      <div className="flex flex-col gap-[10px] flex-1 min-h-px">
        <div className="h-[38px] w-full max-w-[300px] rounded-xl bg-[#e8ebf8]" />

        <TableSkeleton />
      </div>
    </div>
  )
}
