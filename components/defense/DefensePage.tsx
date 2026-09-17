'use client'

import { useState } from 'react'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { UpcomingSessionsContainer } from './UpcomingSessionsContainer'
import { ResubmissionsTable } from './ResubmissionsTable'
import type {
  MyDefenseSchedulePayload,
  DefenseQueuePayload,
} from '@/lib/actions/defense'

type TabId = 'upcoming' | 'resubmissions' | 'completed'

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'resubmissions', label: 'Resubmissions' },
  { id: 'completed', label: 'Completed' },
]

interface DefensePageProps {
  schedules: MyDefenseSchedulePayload[]
  resubmissions: DefenseQueuePayload[]
}

/**
 * Faculty Defense page — tab bar matches the Document Review tab bar exactly
 * (ContextBar + 40px tabs with a 2px active indicator). Upcoming and
 * Resubmissions are implemented; Completed renders a placeholder until its
 * workflow is built.
 */
export function DefensePage({ schedules, resubmissions }: DefensePageProps) {
  const [active, setActive] = useState<TabId>('upcoming')

  // Upcoming = verdict still pending (the defense has not been decided yet).
  const upcoming = schedules.filter((s) => s.verdict === 'PENDING')
  // Completed = verdict has been submitted (APPROVED, MINOR/MAJOR, REJECTED)
  const completed = schedules.filter((s) => s.verdict !== 'PENDING')

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <HeaderBar>
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
      </HeaderBar>

      <div className="flex-1 min-h-0 pt-[16px] px-8 flex flex-col">
        {active === 'upcoming' ? (
          <UpcomingSessionsContainer schedules={upcoming} />
        ) : active === 'resubmissions' ? (
          <ResubmissionsTable items={resubmissions} />
        ) : (
          <UpcomingSessionsContainer
            schedules={completed}
            emptyTitle="No Completed Defenses"
            emptyDescription="Completed defenses will appear here once verdicts are finalized."
          />
        )}
      </div>
    </div>
  )
}
