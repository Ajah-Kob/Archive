'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { HeaderBar } from '@/components/globals/HeaderBar'

const TABS = [
  {
    key: 'members',
    label: 'Members',
    href: '/faculty/faculty-management/members',
  },
  {
    key: 'advisers',
    label: 'Advisers',
    href: '/faculty/faculty-management/advisers',
  },
  {
    key: 'coordinators',
    label: 'Coordinators',
    href: '/faculty/faculty-management/coordinators',
  },
] as const

type FacultiesTabKey = (typeof TABS)[number]['key']

function getActiveKey(pathname: string): FacultiesTabKey {
  if (pathname === '/faculty/faculty-management/coordinators')
    return 'coordinators'
  if (pathname === '/faculty/faculty-management/advisers') return 'advisers'
  return 'members'
}

export function FacultiesTabs() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const viewerCanManage =
    session?.user?.role === 'SUPERADMIN' ||
    session?.user?.role === 'ADMIN' ||
    !!session?.user?.isProgramChair

  const activeKey = getActiveKey(pathname)
  const visibleTabs = TABS.filter(
    (tab) => tab.key !== 'coordinators' || viewerCanManage,
  )

  return (
    <HeaderBar>
      {visibleTabs.map((tab) => {
        const isActive = activeKey === tab.key
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
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
          </Link>
        )
      })}
    </HeaderBar>
  )
}
