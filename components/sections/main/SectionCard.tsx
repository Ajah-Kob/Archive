'use client'

import { Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { UserProfile } from '@/components/ui/UserProfile'
import type { SectionData } from './SectionDataRow'

/**
 * Mobile counterpart to SectionDataRow — one card per section, below `sm`.
 *
 * The table is an eight-column grid at `min-w-[960px]`, so on a phone it was a
 * horizontal scroll to read a single section. This stacks the same fields in
 * reading order: the section name with its capstone phase beside it, the
 * academic year, the coordinator, then the counts and the date.
 *
 * The counts and the creation date share one row because both are short and
 * neither is the thing you scan for — the section name and its coordinator are.
 */
export function SectionCard({
  data,
  actions,
  onAssign,
}: {
  data: SectionData
  actions?: ReactNode
  onAssign?: (section: SectionData) => void
}) {
  const isUnassigned = data.coordinatorId === null

  return (
    <div className="flex flex-col gap-[8px] mb-[10px] last:mb-0 rounded-[12px] border border-[#eceef8] bg-white px-[12px] py-[12px]">
      {/* Section name, with the capstone phase opposite it. */}
      <div className="flex items-center justify-between gap-[10px]">
        <span className="truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145] tracking-[-0.14px]">
          {data.section}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 font-sans font-bold text-[11px] leading-[16.5px] whitespace-nowrap shrink-0 ${
            data.capstonePhase === 'CAPSTONE_2' ? 'text-[#ef4444]' : 'text-[#707dff]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`size-[6px] rounded-full shrink-0 ${data.capstonePhase === 'CAPSTONE_2' ? 'bg-[#ef4444]' : 'bg-[#707dff]'}`}
          />
          {data.capstonePhase === 'CAPSTONE_2' ? 'Capstone 2' : 'Capstone 1'}
        </span>
      </div>

      <span className="block truncate font-sans font-medium text-[13px] leading-[19.5px] text-[#5a6382]">
        {data.academicYear}
      </span>

      {/* Coordinator, or the same assign affordance the row offers. */}
      <div className="min-w-0">
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

      {/* Counts, then the creation date. */}
      <div className="flex items-center gap-[14px] flex-wrap">
        <span className="flex items-center gap-[6px]">
          <Users aria-hidden="true" className="size-[11px] text-[#8a93b4]" />
          <span className="font-sans font-bold text-[12.5px] leading-[18.75px] text-[#1e2145]">
            {data.students}
          </span>
          <span className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
            students
          </span>
        </span>
        <span className="flex items-center gap-[6px]">
          <Users aria-hidden="true" className="size-[11px] text-[#8a93b4]" />
          <span className="font-sans font-bold text-[12.5px] leading-[18.75px] text-[#1e2145]">
            {data.groups}
          </span>
          <span className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
            groups
          </span>
        </span>
      </div>

      <span className="block font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
        Created {data.dateCreated}
      </span>

      {actions ? (
        <div className="flex items-center justify-end gap-[6px] border-t border-[#f0f2fa] pt-[10px] mt-[2px]">
          {actions}
        </div>
      ) : null}
    </div>
  )
}