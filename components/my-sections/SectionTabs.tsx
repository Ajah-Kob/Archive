'use client'

import { useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'
import { ContextBar } from '@/components/globals/ContextBar'

export type SectionTabKey = 'students' | 'progress' | 'topics'

interface SectionTabsProps {
  activeTab: SectionTabKey
  pendingTopics: number
  actions?: ReactNode
  studentsPanel: ReactNode
  progressPanel: ReactNode
  topicsPanel: ReactNode
}

const TABS: { key: SectionTabKey; label: string }[] = [
  { key: 'students', label: 'Students' },
  { key: 'progress', label: 'Milestones' },
  { key: 'topics', label: 'Topic Reviews' },
]

export function SectionTabs({
  activeTab,
  pendingTopics,
  actions,
  studentsPanel,
  progressPanel,
  topicsPanel,
}: SectionTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [tab, setTab] = useState<SectionTabKey>(activeTab)

  function select(key: SectionTabKey) {
    setTab(key)
    router.replace(`${pathname}?tab=${key}`)
  }

  const panels: Record<SectionTabKey, ReactNode> = {
    students: studentsPanel,
    progress: progressPanel,
    topics: topicsPanel,
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ContextBar actions={actions}>
        {TABS.map((t) => {
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => select(t.key)}
              className={`relative flex items-center gap-[7px] h-[40px] px-[14px] font-sans text-[13px] transition-colors ${
                isActive
                  ? 'font-bold text-[#707dff]'
                  : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
              }`}
            >
              {t.label}
              {t.key === 'topics' && pendingTopics > 0 && (
                <span className="flex items-center gap-[4px] h-[18px] px-[6px] rounded-full bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] font-sans font-bold text-[10.5px] leading-[18px] text-[#f59e0b]">
                  <TriangleAlert className="size-[10px]" />
                  {pendingTopics}
                </span>
              )}
              {isActive && (
                <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />
              )}
            </button>
          )
        })}
      </ContextBar>

      <div className="flex-1 min-h-0 pt-[16px] px-8 flex flex-col">
        {panels[tab]}
      </div>
    </div>
  )
}
