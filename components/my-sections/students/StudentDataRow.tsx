'use client'

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
  selected: boolean
  onToggle: () => void
}

export function StudentDataRow({ data, selected, onToggle }: StudentDataRowProps) {
  return (
    <div
      className={`grid grid-cols-[32px_2fr_1fr_1fr] items-center px-[20px] h-[63px] border-b border-[#f0f2fa] transition-colors ${
        selected ? 'bg-[#f4f6ff]/60' : 'hover:bg-slate-50/40'
      }`}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${data.name}`}
          className="size-4 rounded border-[#dddff0] accent-[#707dff] cursor-pointer"
        />
      </div>
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
          <span className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
            {data.group.name}
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
