'use client'

import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { slugify } from '@/lib/slug'

export interface SectionData {
  id: number
  coordinator: {
    initials: string
    name: string
    email: string
    avatarGradient: string
  }
  section: string
  dateCreated: string
  students: number
  groups: number
}

interface SectionDataRowProps {
  data: SectionData
}

export function SectionDataRow({ data }: SectionDataRowProps) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_150px] items-center px-[20px] h-[63px] border-b border-[#f0f2fa] hover:bg-slate-50/40 transition-colors">
      <div className="min-w-0 pr-4">
        <UserProfile
          initials={data.coordinator.initials}
          name={data.coordinator.name}
          email={data.coordinator.email}
          gradient={data.coordinator.avatarGradient}
        />
      </div>

      <div className="pr-4">
        <div className="w-24 px-3 py-[3px] bg-red-400/10 rounded-2xl outline outline-1 outline-offset-[-1px] outline-red-400/20 inline-flex justify-center items-center gap-2.5">
          <span className="text-red-400 text-xs font-bold font-sans leading-4 tracking-tight">
            {data.section}
          </span>
        </div>
      </div>

      <div className="pr-4">
        <span className="font-sans font-medium text-[13px] leading-[19.5px] text-[#8a93b4]">
          {data.dateCreated}
        </span>
      </div>

      <div className="pr-4 flex items-center gap-[6px]">
        <Users className="size-[11px] text-[#8a93b4]" />
        <span className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
          {data.students}
        </span>
      </div>

      <div className="pr-4 flex items-center gap-[6px]">
        <Users className="size-[11px] text-[#8a93b4]" />
        <span className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
          {data.groups}
        </span>
      </div>

      <div className="flex justify-end">
        <ActionMenu
          items={[
            {
              label: 'View Details',
              onClick: () => router.push(`/sections/${slugify(data.section)}`),
            },
          ]}
        />
      </div>
    </div>
  )
}
