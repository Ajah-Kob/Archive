'use client'

import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import { UserProfile } from '@/components/ui/UserProfile'

export const UNASSIGNED_COORDINATOR_LABEL = 'No Coordinator Assigned'

export interface SectionData {
  id: number
  coordinatorId: number | null
  coordinator: {
    id: number
    initials: string
    name: string
    email: string
    avatarGradient: string
  } | null
  section: string
  academicYear: string
  capstonePhase: 'CAPSTONE_1' | 'CAPSTONE_2'
  dateCreated: string
  students: number
  groups: number
}

interface SectionDataRowProps {
  data: SectionData
  actions?: ReactNode
  onAssign?: (section: SectionData) => void
}

export function SectionDataRow({ data, actions, onAssign }: SectionDataRowProps) {
  const isUnassigned = data.coordinatorId === null

  return (
    <div
      role="row"
      className="grid grid-cols-[1.4fr_1fr_0.9fr_1.5fr_1fr_0.7fr_0.7fr_120px] items-center px-[20px] h-[63px] border-b border-[#f0f2fa] last:border-b-0 hover:bg-slate-50/40 transition-colors"
    >
      <div role="cell" className="pr-4 min-w-0">
        <span className="inline-flex items-center font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145] tracking-[-0.14px] truncate">
          {data.section}
        </span>
      </div>

      <div role="cell" className="pr-4 min-w-0">
        <span className="font-sans font-medium text-[13px] leading-[19.5px] text-[#5a6382] truncate">
          {data.academicYear}
        </span>
      </div>

      <div role="cell" className="pr-4">
        <span
          className={`inline-flex items-center gap-1.5 font-sans font-bold text-[11px] leading-[16.5px] ${data.capstonePhase === 'CAPSTONE_2' ? 'text-[#ef4444]' : 'text-[#707dff]'}`}
        >
          <span
            aria-hidden="true"
            className={`size-[6px] rounded-full shrink-0 ${data.capstonePhase === 'CAPSTONE_2' ? 'bg-[#ef4444]' : 'bg-[#707dff]'}`}
          />
          {data.capstonePhase === 'CAPSTONE_2' ? 'Capstone 2' : 'Capstone 1'}
        </span>
      </div>

      <div role="cell" className="min-w-0 pr-4">
        {isUnassigned ? (
          <button
            type="button"
            onClick={() => onAssign?.(data)}
            aria-label={`Assign coordinator to ${data.section}`}
            className="font-sans font-semibold text-[12px] leading-[18px] text-[#707dff] underline underline-offset-2 hover:text-[#5062f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#707dff] transition-colors"
          >
            + Assign coordinator
          </button>
        ) : data.coordinator ? (
          <UserProfile
            initials={data.coordinator.initials}
            name={data.coordinator.name}
            email={data.coordinator.email}
            gradient={data.coordinator.avatarGradient}
          />
        ) : (
          <span className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
            Unavailable
          </span>
        )}
      </div>

      <div role="cell" className="pr-4">
        <span className="font-sans font-medium text-[13px] leading-[19.5px] text-[#8a93b4]">
          {data.dateCreated}
        </span>
      </div>

      <div role="cell" className="pr-4 flex items-center gap-[6px]">
        <Users aria-hidden="true" className="size-[11px] text-[#8a93b4]" />
        <span className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
          {data.students}
        </span>
      </div>

      <div role="cell" className="pr-4 flex items-center gap-[6px]">
        <Users aria-hidden="true" className="size-[11px] text-[#8a93b4]" />
        <span className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
          {data.groups}
        </span>
      </div>

      <div role="cell" className="flex justify-end">
        {actions ?? <span aria-hidden="true" className="inline-block w-[30px]" />}
      </div>
    </div>
  )
}
