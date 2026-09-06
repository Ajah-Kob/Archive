'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  FileText,
  BookMarked,
  Layers,
  ClipboardCheck,
  Shield,
  CalendarClock,
  Flag,
  Users,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { roleHome } from '@/lib/helper'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  show: boolean
}

type NavSection = {
  label: string
  items: NavItem[]
}

function isNavActive(pathname: string, href: string) {
  if (
    href === '/faculty/my-sections' ||
    href === '/faculty/document-review' ||
    href === '/faculty/faculties' ||
    href === '/faculty/coordinators'
  ) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  return pathname === href
}

export function NavLinks({
  pathname,
  minimize,
}: {
  pathname: string
  minimize: boolean
}) {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'
  const isFaculty = !!session?.user?.isFaculty
  const isCoordinator = !!session?.user?.isCoordinator
  const isAdviser = !!session?.user?.isAdviser
  const isStudent = !!session?.user?.isStudent

  const dashboardHref = roleHome(role)
  const templatesHref = isAdmin
    ? '/admin/templates'
    : isFaculty
      ? '/faculty/templates'
      : isStudent
        ? '/student/templates'
        : null
  const isProgramChair = !!session?.user?.isProgramChair

  const sections: NavSection[] = [
    {
      label: 'OVERVIEW',
      items: [{ label: 'Dashboard', href: dashboardHref, icon: LayoutDashboard, show: true }],
    },
    {
      label: 'CAPSTONE',
      items: [
        { label: 'Milestones', href: '/student/milestone', icon: Flag, show: isStudent },
        { label: 'My Sections', href: '/faculty/my-sections', icon: Layers, show: isCoordinator },
        { label: 'Document Review', href: '/faculty/document-review', icon: ClipboardCheck, show: isAdviser },
        { label: 'Defense', href: '/faculty/defense', icon: Shield, show: isFaculty },
        { label: 'Defense Scheduling', href: '/faculty/defense-scheduling', icon: CalendarClock, show: isCoordinator },
      ],
    },
    {
      label: 'PROGRAM MANAGEMENT',
      items: [
        {
          label: 'Faculties',
          href: '/faculty/faculties',
          icon: Users,
          show: isAdmin || isCoordinator || isProgramChair,
        },
        {
          label: 'Coordinators',
          href: '/faculty/coordinators',
          icon: UserCog,
          show: isAdmin || isProgramChair,
        },
      ],
    },
    {
      label: 'RESOURCES',
      items: [
        { label: 'Repositories', href: '/repository', icon: BookMarked, show: true },
        ...(templatesHref ? [{ label: 'Templates', href: templatesHref, icon: FileText, show: true } as NavItem] : []),
      ],
    },
  ]

  return (
    <div className="flex flex-col">
      {sections.map((section, sIndex) => {
        const visibleItems = section.items.filter((i) => i.show)
        if (visibleItems.length === 0) return null

        return (
          <div key={section.label}>
            {sIndex > 0 && minimize && <div className="border-t border-[#eceef8] mx-2 my-1" />}

            {!minimize && (
              <p className="px-[10px] pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#b0b8d4]">
                {section.label}
              </p>
            )}

            <div className="flex flex-col gap-0.5">
              {visibleItems.map((item) => {
                const isActive = isNavActive(pathname, item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={minimize ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex items-center h-11 w-full rounded-[10px] pl-[10px] pr-[10px] gap-3 overflow-hidden transition-colors ${
                      isActive ? 'bg-[rgba(112,125,255,0.1)]' : 'hover:bg-[rgba(112,125,255,0.05)]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] rounded-full bg-[#707dff]" />
                    )}
                    <span className="flex items-center justify-center w-5 shrink-0">
                      <Icon
                        size={20}
                        className={`${isActive ? 'text-[#707dff]' : 'text-[#5a6382] group-hover:text-[#707dff]'}`}
                      />
                    </span>
                    <span
                      className={`text-[13px] whitespace-nowrap shrink-0 transition-opacity duration-300 ${
                        minimize ? 'opacity-0' : 'opacity-100'
                      } ${isActive ? 'font-bold text-[#707dff]' : 'font-medium text-[#5a6382] group-hover:text-[#707dff]'}`}
                    >
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
