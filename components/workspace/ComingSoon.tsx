import { Construction } from 'lucide-react'

export function ComingSoon({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] px-[60px] py-[52px] flex flex-col items-center max-w-[460px]">
        <div className="size-[84px] rounded-[24px] bg-gradient-to-br from-[#707dff] to-[#5565ff] flex items-center justify-center shadow-[0px_8px_18px_0px_rgba(112,125,255,0.32)]">
          <Construction className="size-9 text-white" strokeWidth={1.75} />
        </div>
        <p className="font-heading font-bold text-[17px] leading-[27px] text-[#12143a] tracking-[-0.18px] pt-[20px]">
          {title}
        </p>
        <p className="font-sans font-medium text-[13.5px] leading-[22.275px] text-[#8a93b4] text-center pt-[8px]">
          {description}
        </p>
      </div>
    </div>
  )
}
