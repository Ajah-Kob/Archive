'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { SectionModal } from './SectionModal'

export function MySectionsHeader() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex gap-[7px] items-center px-[15px] h-[37.5px] rounded-[9px] font-sans font-bold text-[13px] leading-[19.5px] text-white cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all shrink-0"
        style={{
          backgroundImage:
            'linear-gradient(163.7deg, rgb(112, 125, 255) 0%, rgb(85, 101, 255) 100%)',
          boxShadow: '0px 4px 6px rgba(112,125,255,0.25)',
        }}
      >
        <Plus className="size-4" />
        Create Section
      </button>

      {open && (
        <SectionModal
          mode="create"
          onClose={() => setOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  )
}
