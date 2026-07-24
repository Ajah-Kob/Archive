'use client'

import { useState } from 'react'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActionButton } from '@/components/ui/ActionButton'
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

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
          <div className="relative">
            <ActionButton onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)} />
            {openMenuId === member.id && (
              <div className="absolute right-0 top-full z-10 pt-1">
                <ActionMenu
                  onViewDetails={() => {
                    console.log('View details:', member.id)
                    setOpenMenuId(null)
                  }}
                  onRemoveFaculty={() => {
                    console.log('Remove faculty:', member.id)
                    setOpenMenuId(null)
                  }}
                  onClose={() => setOpenMenuId(null)}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
