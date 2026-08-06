'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { copySectionJoinCode } from '@/lib/actions/sections'
import type { MySectionCardData } from '@/lib/actions/sections'

const ACCENT_BAR = '#707dff'

interface MySectionsCardProps {
  section: MySectionCardData
  onEdit: (section: MySectionCardData) => void
  onRemove: (section: MySectionCardData) => void
}

export function MySectionsCard({ section, onEdit, onRemove }: MySectionsCardProps) {
  const router = useRouter()

  async function handleCopyCode() {
    const res = await copySectionJoinCode(section.id)
    if (!res.success || !res.payload) {
      toast.error(res.message)
      return
    }
    try {
      await navigator.clipboard.writeText(res.payload.code)
    } catch {
      // clipboard unavailable — the code is still regenerated server-side
    }
    toast.success(
      res.payload.regenerated
        ? 'New invite code generated and copied.'
        : 'Invite code copied.',
    )
    router.refresh()
  }

  return (
    <div className="relative flex items-center justify-between gap-[20px] bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] pl-[26px] pr-[21px] py-[19px]">
      <div
        className="absolute left-0 top-0 h-full w-[5px] rounded-tl-[14px] rounded-bl-[14px]"
        style={{ backgroundColor: ACCENT_BAR }}
      />

      <div className="flex flex-col min-w-0 flex-1">
        <h3 className="font-['Sora',sans-serif] font-extrabold text-[26px] leading-[26px] text-[#1e3a8a] tracking-[-0.52px] whitespace-nowrap">
          {section.name}
        </h3>

        <div className="flex flex-wrap items-center gap-[10px] pt-[8px]">
          <span className="flex gap-[6px] items-center font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#6b7399]">
            <Users className="size-[13px] text-[#9ea8c6]" />
            {section.students} Students
          </span>
          <span className="font-sans text-[12px] leading-[18px] text-[#dde0f0]">
            ·
          </span>
          <span className="flex gap-[6px] items-center font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#6b7399]">
            <Users className="size-[13px] text-[#9ea8c6]" />
            {section.groups} Groups
          </span>
          <span className="font-sans text-[12px] leading-[18px] text-[#dde0f0]">
            ·
          </span>
          <span className="font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
            Created {section.dateCreated}
          </span>
        </div>
      </div>

      <div className="flex gap-[8px] items-center shrink-0">
        <button
          onClick={() => router.push(`/my-sections/${section.id}`)}
          className="flex gap-[7px] items-center px-[16px] py-[9px] rounded-[9px] font-sans font-bold text-[12.5px] leading-[18.75px] text-white hover:opacity-90 active:scale-[0.98] transition-all"
          style={{
            backgroundImage:
              'linear-gradient(177.47deg, rgb(112, 125, 255) 6.9%, rgb(85, 101, 255) 93.1%)',
            boxShadow: '0px 3px 2.5px rgba(112,125,255,0.21)',
          }}
        >
          <Users className="size-[13px]" />
          Manage Students
          <ArrowRight className="size-[12px]" />
        </button>

        <ActionMenu
          items={[
            {
              label: section.hasJoinCode ? 'Copy Invite Code' : 'Generate Invite Code',
              onClick: handleCopyCode,
            },
            { label: 'Edit Section', onClick: () => onEdit(section) },
            {
              label: 'Remove Section',
              onClick: () => onRemove(section),
              variant: 'danger',
            },
          ]}
        />
      </div>
    </div>
  )
}
