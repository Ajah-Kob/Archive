'use client'

import { useState } from 'react'
import { Shield } from 'lucide-react'
import { ContextBar } from '@/components/globals/ContextBar'
import { UpcomingSessionsContainer } from './UpcomingSessionsContainer'
import { ResubmissionsTable } from './ResubmissionsTable'
import type {
  MyDefenseSchedulePayload,
  DefenseResubmissionPayload,
} from '@/lib/actions/defense'

type TabId = 'upcoming' | 'resubmissions' | 'completed'

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'resubmissions', label: 'Resubmissions' },
  { id: 'completed', label: 'Completed' },
]

interface DefensePageProps {
  schedules: MyDefenseSchedulePayload[]
  resubmissions: DefenseResubmissionPayload[]
}

/**
 * Faculty Defense page — tab bar matches the Document Review tab bar exactly
 * (ContextBar + 40px tabs with a 2px active indicator). Upcoming and
 * Resubmissions are implemented; Completed renders a placeholder until its
 * workflow is built.
 */
export function DefensePage({
  schedules,
  resubmissions,
}: DefensePageProps) {
  const [active, setActive] = useState<TabId>('upcoming')

  // Upcoming = verdict still pending (the defense has not been decided yet).
  const upcoming = schedules.filter((s) => s.verdict === 'PENDING')

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ContextBar>
        {TABS.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`relative flex items-center h-[40px] px-[14px] font-sans text-[13px] transition-colors ${
                isActive
                  ? 'font-bold text-[#707dff]'
                  : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />
              )}
            </button>
          )
        })}
      </ContextBar>

      <div className="flex-1 min-h-0 pt-[16px] px-8 flex flex-col">
        {active === 'upcoming' ? (
          <UpcomingSessionsContainer schedules={upcoming} />
        ) : active === 'resubmissions' ? (
          <ResubmissionsTable items={resubmissions} />
        ) : (
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col items-center justify-center px-10 py-16">
            <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
              <Shield className="size-5 text-[#707dff]" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
              Completed
            </h3>
            <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
              Completed defenses will appear here once verdicts are finalized.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}