import { Info } from 'lucide-react'

export function WelcomeBanner() {
  return (
    <div className="flex items-center gap-[10px] bg-[rgba(112,124,255,0.1)] border border-[rgba(112,125,255,0.2)] rounded-[10px] px-[17px] py-[11px]">
      <Info size={14} className="text-[rgb(112,125,255)]" />
      <span className="text-[13px] font-medium text-[#5a6382] leading-[19.5px]">
        Join a Student Section or the Faculty to unlock Archive's collaboration
        features.
      </span>
    </div>
  )
}
