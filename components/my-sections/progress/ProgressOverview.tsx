'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import type { SectionGroupProgress } from '@/lib/actions/sections'
import type { JourneyRow } from '@/types/milestones'
import { JourneyTracker } from '@/components/milestones/JourneyTracker'
import { GroupProgressDrawer } from './GroupProgressDrawer'

interface ProgressOverviewProps {
  groups: SectionGroupProgress[]
}

function currentStep(journey: JourneyRow[]): string {
  const active = journey.find((r) =>
    ['DEFAULT', 'SUBMITTED', 'NEEDS_REVISION'].includes(r.state),
  )
  if (active) return active.label
  if (journey.length > 0 && journey.every((r) => r.state === 'APPROVED')) {
    return 'Completed'
  }
  if (journey.length > 0 && journey.every((r) => r.state === 'LOCKED')) {
    return 'Not started'
  }
  return '—'
}

function TopicPill({ status }: { status: SectionGroupProgress['topicStatus'] }) {
  if (status === 'NONE') {
    return (
      <span className="font-sans font-medium italic text-[12px] leading-[18px] text-[#c4cadf]">
        No topic
      </span>
    )
  }
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#eefbf2] border border-[rgba(34,197,94,0.25)] font-sans font-bold text-[11px] leading-[16.5px] text-[#22c55e] whitespace-nowrap">
        Topic approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] font-sans font-bold text-[11px] leading-[16.5px] text-[#f59e0b] whitespace-nowrap">
      {status === 'PENDING' ? 'Topic pending' : 'Needs revision'}
    </span>
  )
}

export function ProgressOverview({ groups }: ProgressOverviewProps) {
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)

  return (
    <>
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2.5 px-5 py-[14px] border-b border-[#f0f2fa] shrink-0">
          <h3 className="font-heading font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
            Group Progress
          </h3>
          <span className="font-sans font-semibold text-[12px] leading-[18px] text-[#9ea8c6]">
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-10 py-16">
            <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
              <Users className="size-5 text-[#707dff]" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
              No Groups Yet
            </h3>
            <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
              Once students form groups in this section, their capstone progress
              will appear here.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr_1.6fr] items-center px-[20px] h-[40px] border-b border-[#f0f2fa] bg-[#fafbff] sticky top-0">
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Group
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Members
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Adviser
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Topic
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
              className="w-full grid grid-cols-[1.4fr_0.8fr_1fr_1fr_1.6fr] items-center px-[20px] h-[58px] border-b border-[#f0f2fa] text-left hover:bg-slate-50/60 transition-colors last:border-b-0"
            >
              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                  {group.name}
                </span>
                <span className="block font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
                  {currentStep(group.journey)}
                </span>
              </span>

              <span className="pr-4 font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#6b7399]">
                {group.memberCount}
              </span>

              <span className="min-w-0 pr-4">
                {group.adviser ? (
                  <span className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                    {group.adviser.name}
                  </span>
                ) : (
                  <span className="font-sans font-medium italic text-[12px] leading-[18px] text-[#c4cadf]">
                    None
                  </span>
                )}
              </span>

              <span className="pr-4">
                <TopicPill status={group.topicStatus} />
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
