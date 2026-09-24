'use client'

import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { UserProfile } from '@/components/ui/UserProfile'
import type { SectionGroupProgress } from '@/lib/actions/sections'
import { JourneyTracker } from '@/components/milestones/JourneyTracker'
import { getInitials } from '@/lib/helper'
import { GroupProgressDrawer } from './GroupProgressDrawer'

interface ProgressOverviewProps {
  groups: SectionGroupProgress[]
}

export function ProgressOverview({ groups }: ProgressOverviewProps) {
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)

  return (
    <>
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
        {groups.length === 0 ? (
          <EmptyState
            heading="No Groups Yet"
            description="Once students form groups in this section, their capstone progress will appear here."
            variant="card"
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-[1.4fr_0.8fr_1fr_1.6fr] items-center px-[20px] h-[40px] border-b border-[#f0f2fa] bg-[#fafbff] sticky top-0 rounded-t-[14px]">
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Team
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Members
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Adviser
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Journey
            </span>
          </div>

          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroupId(group.id)}
              className="w-full grid grid-cols-[1.4fr_0.8fr_1fr_1.6fr] items-center px-[20px] h-[58px] border-b border-[#f0f2fa] text-left hover:bg-slate-50/60 transition-colors last:border-b-0"
            >
              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                  {group.name}
                </span>
              </span>

              <span className="pr-4 font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#6b7399]">
                {group.memberCount}
              </span>

              <span className="min-w-0 pr-4">
                {group.adviser ? (
                  <UserProfile
                    initials={getInitials(group.adviser.name)}
                    name={group.adviser.name}
                    email={group.adviser.email}
                  />
                ) : (
                  <span className="font-sans font-medium italic text-[12px] leading-[18px] text-[#c4cadf]">
                    None
                  </span>
                )}
              </span>

              <span>
                <JourneyTracker journey={group.journey} size="sm" />
              </span>
            </button>
          ))}
          </div>
        )}
      </div>

      <GroupProgressDrawer
        groupId={activeGroupId}
        onClose={() => setActiveGroupId(null)}
      />
    </>
  )
}
