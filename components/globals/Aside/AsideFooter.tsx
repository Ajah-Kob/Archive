'use client'

import { Bell } from 'lucide-react'

export function CollapsedFooter({ initials }: { initials: string }) {
  return (
    <div className="border-t border-[#eceef8] flex flex-col gap-[4px] h-[110px] justify-center px-[8px] py-[10px] shrink-0 w-full">
      <div className="flex items-center px-[19px] py-[11px] rounded-[9px] hover:bg-[rgba(112,125,255,0.05)] transition-colors w-full">
        <div className="relative">
          <Bell size={17} className="text-[#5a6382]" />
          <span className="absolute -top-[3px] -right-[3px] size-[8px] rounded-full bg-[#fe6f6f] border border-[#fafbff]" />
        </div>
      </div>
      <div className="flex items-center justify-center h-[48px] px-[10px] py-[7px] rounded-[10px] hover:bg-[rgba(112,125,255,0.05)] transition-colors w-full">
        <div
          className="size-[34px] rounded-full flex items-center justify-center shrink-0 shadow-[0px_2px_4px_rgba(0,0,0,0.14)]"
          style={{
            backgroundImage:
              'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
          }}
        >
          <span className="text-white text-[12px] font-bold tracking-[0.5px]">
            {initials}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ExpandedFooter({
  initials,
  name,
  role,
}: {
  initials: string
  name: string
  role: string
}) {
  return (
    <div className="border-t border-[#eceef8] flex flex-col gap-1 h-27.5 justify-center p-2 shrink-0 w-full">
      <div className="flex gap-1 items-center w-full">
        <div className="flex items-center px-[19px] py-[11px] rounded-[9px] hover:bg-[rgba(112,125,255,0.05)] transition-colors">
          <div className="relative">
            <Bell size={17} className="text-[#5a6382]" />
            <span className="absolute -top-0.75 -right-0.75 size-2 rounded-full bg-[#fe6f6f] border border-[#fafbff]" />
          </div>
        </div>
        <div className="flex-1 flex gap-1 items-center min-w-px pr-2.5">
          <span className="flex-1 text-[13.5px] font-medium text-[#5a6382]">
            Notifications
          </span>
          <span className="bg-[#fe6f6f] text-white text-[10.5px] font-bold px-[6px] rounded-[10px] h-[19px] flex items-center">
            3
          </span>
        </div>
      </div>

      <div className="flex gap-[4px] items-center w-full">
        <div className="flex items-center justify-center h-[48px] px-[10.5px] py-[7px] rounded-[10px] hover:bg-[rgba(112,125,255,0.05)] transition-colors">
          <div
            className="size-[34px] rounded-full flex items-center justify-center shrink-0 shadow-[0px_2px_4px_rgba(0,0,0,0.14)]"
            style={{
              backgroundImage:
                'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
            }}
          >
            <span className="text-white text-[12.5px] font-bold tracking-[0.5px]">
              {initials}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-px w-auto pr-5">
          <span className="text-[13px] font-bold text-[#12143a] truncate">
            {name}
          </span>
          <span className="text-[11px] font-medium text-[#9ea8c6] truncate">
            {role}
          </span>
        </div>
      </div>
    </div>
  )
}
