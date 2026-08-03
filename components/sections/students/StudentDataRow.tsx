'use client'

import { Users } from 'lucide-react'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActivityStatus } from '@/components/ui/ActivityStatus'

export interface StudentData {
  id: number
  userId: number
  initials: string
  name: string
  email: string
  avatarGradient: string
  activityStatus: 'active' | string
  loggedInAt: Date | null
  group: { name: string; members: number } | null
}

interface StudentDataRowProps {
  data: StudentData
}

export function StudentDataRow({ data }: StudentDataRowProps) {
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr] items-center px-[20px] h-[63px] border-b border-[#f0f2fa] hover:bg-slate-50/40 transition-colors">
      <div className="min-w-0 pr-4">
        <UserProfile
          initials={data.initials}
          name={data.name}
          email={data.email}
          gradient={data.avatarGradient}
        />
      </div>

      <div className="pr-4">
        <ActivityStatus status={data.activityStatus} />
      </div>

      <div className="min-w-0 pr-4">
        {data.group ? (
          <span className="inline-flex items-center gap-2 px-[10px] py-[4px] bg-[#f4f6ff] border border-[#e5e8ff] rounded-full font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
            <Users className="size-[11px]" />
            {data.group.name} · {data.group.members}
          </span>
        ) : (
          <span className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">
            No group
          </span>
        )}
      </div>
    </div>
  )
}
