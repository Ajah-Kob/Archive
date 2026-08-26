'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { ContextBar } from '@/components/globals/ContextBar'
import { EvaluationTeamsView } from '@/components/evaluation/teams/EvaluationTeamsView'
import type { EvaluationItem } from '@/lib/actions/evaluation'

type TabId = 'teams' | 'defense'

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'teams', label: 'Teams' },
  { id: 'defense', label: 'Defense' },
]

export function EvaluationTabs({ items }: { items: EvaluationItem[] }) {
  const [active, setActive] = useState<TabId>('teams')

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
        {active === 'teams' ? (
          <EvaluationTeamsView items={items} />
        ) : (
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col items-center justify-center px-10 py-16">
            <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
              <Users className="size-5 text-[#707dff]" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
              Defense Evaluations
            </h3>
            <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
              Defense evaluations from panelists will appear here once the
              panelist workflow is available.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}