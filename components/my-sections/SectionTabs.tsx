'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { HeaderBar } from '@/components/globals/HeaderBar'

export type SectionTabKey = 'overview' | 'students' | 'teams' | 'milestones'

interface SectionTabsProps {
  sectionId: string
  actions?: ReactNode
  children: ReactNode
}

const TABS: { key: SectionTabKey; label: string; segment: string }[] = [
  { key: 'overview', label: 'Overview', segment: 'overview' },
  { key: 'students', label: 'Students', segment: 'students' },
  { key: 'teams', label: 'Teams', segment: 'teams' },
  { key: 'milestones', label: 'Milestones', segment: 'milestones' },
]

function getActiveKey(pathname: string): SectionTabKey {
  if (pathname.includes('/milestones')) return 'milestones'
  if (pathname.includes('/teams')) return 'teams'
  if (pathname.includes('/students')) return 'students'
  if (pathname.includes('/overview')) return 'overview'
  // Bare /faculty/my-sections/[sectionId] (no segment) defaults to Overview.
  // Matches spec: return overview when pathname ends with /[sectionId] or /overview.
  if (/\/faculty\/my-sections\/[^/]+\/?$/.test(pathname)) return 'overview'
  return 'overview'
}

export function SectionTabs({ sectionId, actions, children }: SectionTabsProps) {
  const pathname = usePathname()
  const activeKey = getActiveKey(pathname)
  const base = `/faculty/my-sections/${sectionId}`

  const backButton = (
    <Link
      href="/faculty/my-sections"
      className="inline-flex items-center gap-0.5 font-sans font-semibold text-[13px] text-[#8a93b4] hover:text-[#5a6382] hover:bg-white/60 rounded-full px-2 py-1 transition-colors"
    >
      <ChevronLeft className="size-4" /> Back
    </Link>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <HeaderBar actions={actions ? <>{actions}{backButton}</> : backButton}>
        {TABS.map((t) => {
          const isActive = activeKey === t.key
          return (
            <Link
              key={t.key}
              href={`${base}/${t.segment}`}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-[7px] h-[40px] px-[14px] font-sans text-[13px] transition-colors ${
                isActive ? 'font-bold text-[#707dff]' : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
              }`}
            >
              {t.label}
              {isActive && <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />}
            </Link>
          )
        })}
      </HeaderBar>

      <div
        className={
          activeKey === 'students'
            ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
            : 'flex-1 min-h-0 pt-[16px] px-8 pb-6 flex flex-col overflow-y-auto'
        }
      >
        {children}
      </div>
    </div>
  )
}
