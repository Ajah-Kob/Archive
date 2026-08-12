import Link from 'next/link'
import { FileLock2 } from 'lucide-react'

export function LockedGroupPlaceholder() {
  return (
    <div className="h-full bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center px-[41px] py-[53px] text-center">
      <div className="size-[96px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
        <FileLock2 className="size-10 text-[#9ea8c6]" strokeWidth={1.75} />
      </div>
      <p className="font-heading font-bold text-[18px] leading-[27px] text-[#12143a] tracking-[-0.18px] pt-[20px]">
        Locked — join a group first
      </p>
      <p className="font-sans font-medium text-[13.5px] leading-[22.275px] text-[#8a93b4] max-w-[360px] pt-[8px] pb-[24px]">
        Topics are submitted per group. Join a capstone group from the
        Milestones page, then return here to submit your topics.
      </p>
      <Link
        href="/milestones"
        className="flex items-center justify-center h-[40px] px-[20px] rounded-[10px] text-[13px] font-semibold text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] hover:opacity-95 transition-opacity"
        style={{
          backgroundImage: 'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
        }}
      >
        Back to Milestones
      </Link>
    </div>
  )
}
