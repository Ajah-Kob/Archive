import { Lock } from 'lucide-react'

interface LockedChapterPlaceholderProps {
  chapterLabel: string
}

export function LockedChapterPlaceholder({ chapterLabel }: LockedChapterPlaceholderProps) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-[10px] rounded-[14px] border border-[#e0e3f0] bg-[#f8f9ff] text-center px-[24px]">
      <div className="flex size-[48px] items-center justify-center rounded-full bg-[#eef0fb]">
        <Lock className="size-[20px] text-[#707dff]" strokeWidth={2} />
      </div>
      <p className="font-sora text-[14px] font-semibold text-[#1e3a8a]">
        {chapterLabel} is currently locked
      </p>
      <p className="text-[12px] text-[#5a6382]">
        Please wait for your coordinator to open this chapter.
      </p>
    </div>
  )
}