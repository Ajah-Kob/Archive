'use client'

import { UserProfile } from '@/components/ui/UserProfile'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { ActivityStatus } from '../ui/ActivityStatus'
import { Workload } from './Workload'

export interface FacultyMember {
  id: number
  initials: string
  name: string
  email: string
  avatarGradient: string
  activityStatus: 'active' | string
  workload: { current: number; max: number }
}

interface FacultyTableProps {
  faculty: FacultyMember[]
}

export function FacultyTable({ faculty }: FacultyTableProps) {
  return (
    <div className="w-full">
      <div className="flex bg-[#fafbff] border-b border-[#f0f2fa]">
        <div className="w-[350px] px-4 py-[9px]">
          <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#8a93b4] tracking-[0.735px] uppercase">
            Adviser
          </span>
        </div>
        <div className="w-[230px] px-4 py-[9px]">
          <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#8a93b4] tracking-[0.735px] uppercase">
            Activity
          </span>
        </div>
        <div className="w-[375px] px-4 py-[9px]">
          <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#8a93b4] tracking-[0.735px] uppercase">
            Workload
          </span>
        </div>
        <div className="w-[78px]" />
      </div>

      {faculty.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between px-[30px] py-[10px] border-b border-[#f0f2fa]"
        >
          <div className="w-[247px]">
            <UserProfile
              initials={member.initials}
              name={member.name}
              email={member.email}
              gradient={member.avatarGradient}
            />
          </div>
          <div className="w-[146px]">
            <ActivityStatus status={member.activityStatus} />
          </div>
          <div className="w-[197px]">
            <Workload current={member.workload.current} max={member.workload.max} />
          </div>
          <ActionMenu
            items={[
              { label: 'View Details', onClick: () => console.log('View details:', member.id) },
              { label: 'Remove Faculty', onClick: () => console.log('Remove faculty:', member.id), variant: 'danger' },
            ]}
          />
        </div>
      ))}
    </div>
  )
}
