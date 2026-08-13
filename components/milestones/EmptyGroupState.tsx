'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { CreateGroupModal } from '@/components/milestones/CreateGroupModal'

export function EmptyGroupState() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex-1 min-h-0 bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center px-[41px] py-[53px]">
        <div className="size-[96px] rounded-full bg-gradient-to-br from-[#707dff] to-[#5565ff] flex items-center justify-center shadow-[0px_12px_24px_0px_rgba(112,125,255,0.28)]">
          <Users className="size-10 text-white" strokeWidth={1.75} />
        </div>
        <p className="font-heading font-bold text-[18px] leading-[27px] text-[#12143a] tracking-[-0.18px] pt-[20px]">
          You&apos;re not in a group yet
        </p>
        <p className="font-sans font-medium text-[13.5px] leading-[22.275px] text-[#8a93b4] text-center max-w-[340px] pt-[8px] pb-[24px]">
          Create a new capstone group and invite your classmates, or wait for a
          group leader to invite you.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex gap-[7px] items-center justify-center h-[40.25px] px-[20px] rounded-[10px] text-[13.5px] font-semibold text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] hover:opacity-95 transition-opacity"
          style={{
            backgroundImage: 'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
          }}
        >
          <Users className="size-[15px]" />
          Create Group
        </button>
      </div>

      {open && (
        <CreateGroupModal
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
