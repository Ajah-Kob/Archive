'use client'

import { useRouter } from 'next/navigation'
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
  capstonePhase: 'CAPSTONE_1' | 'CAPSTONE_2'
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
    <div className="grid grid-cols-[1.6fr_0.9fr_1.5fr_1fr_0.8fr_0.8fr_150px] items-center px-[20px] h-[63px] border-b border-[#f0f2fa] hover:bg-slate-50/40 transition-colors">
      <div className="pr-4 min-w-0">
        <span className="inline-flex items-center font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145] tracking-[-0.14px] truncate">
          {data.section}
        </span>
      </div>

      <div className="pr-4">
        <span className={`inline-flex items-center gap-1.5 font-sans font-bold text-[11px] leading-[16.5px] ${data.capstonePhase === 'CAPSTONE_2' ? 'text-[#ef4444]' : 'text-[#707dff]'}`}>
          <span className={`size-[6px] rounded-full shrink-0 ${data.capstonePhase === 'CAPSTONE_2' ? 'bg-[#ef4444]' : 'bg-[#707dff]'}`} />
          {data.capstonePhase === 'CAPSTONE_2' ? 'Capstone 2' : 'Capstone 1'}
        </span>
      </div>

      <div className="min-w-0 pr-4">
        <UserProfile
          initials={data.coordinator.initials}
          name={data.coordinator.name}
          email={data.coordinator.email}
          gradient={data.coordinator.avatarGradient}
        />
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
              onClick: () => router.push(`/faculty/my-sections/${data.id}`),
            },
          ]}
        />
      </div>
    </div>
  )
}
