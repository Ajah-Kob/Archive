'use client'

import { Users } from 'lucide-react'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActionMenu } from '@/components/ui/ActionMenu'

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
  return (
    <div className="flex items-center py-[10px] border-b border-[#f0f2fa]">
      <div className="w-[300px] shrink-0 px-7">
        <UserProfile
          initials={data.coordinator.initials}
          name={data.coordinator.name}
          email={data.coordinator.email}
          gradient={data.coordinator.avatarGradient}
        />
      </div>

      <div className="w-[150px] shrink-0">
        <div className="w-24 px-3 py-[3px] bg-red-400/10 rounded-2xl outline outline-1 outline-offset-[-1px] outline-red-400/20 inline-flex justify-center items-center gap-2.5">
          <span className="text-red-400 text-xs font-bold font-sans leading-4 tracking-tight">
            {data.section}
          </span>
        </div>
      </div>

      <div className="w-[170px] shrink-0">
        <span className="font-sans font-medium text-[13px] leading-[19.5px] text-[#8a93b4]">
          {data.dateCreated}
        </span>
      </div>

      <div className="w-[150px] shrink-0 flex items-center gap-[6px]">
        <Users className="size-[11px] text-[#8a93b4]" />
        <span className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
          {data.students}
        </span>
      </div>

      <div className="w-[187px] shrink-0">
        <Users className="size-[11px] text-[#8a93b4]" />
        <span className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
          {data.groups}
        </span>
      </div>

      <div className="w-[78px] shrink-0">
        <ActionMenu
          items={[
            { label: 'View Details', onClick: () => {} },
            { label: 'Remove Section', onClick: () => {}, variant: 'danger' },
          ]}
        />
      </div>
    </div>
  )
}
