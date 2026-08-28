'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  Shield,
  Calendar,
  BookMarked,
  UserPlus,
  Layers,
  ClipboardCheck,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'
import { SectionsGroup } from './SectionsGroup'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

type NavGroup = {
  label: string
  items: NavItem[]
  /** Whether this group should be shown. Evaluated from session. */
  show: boolean
}

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Sections', href: '/admin/sections', icon: Layers },
  { label: 'Templates', href: '/admin/templates', icon: FileText },
  { label: 'Faculties', href: '/faculty/faculties', icon: Users },
  { label: 'Defense', href: '/defense', icon: Shield },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Repositories', href: '/repository', icon: BookMarked },
]

const GUEST_ITEMS: NavItem[] = [
  { label: 'Home', href: '/guest', icon: LayoutDashboard },
  { label: 'Join', href: '/guest/join-archive', icon: UserPlus },
  { label: 'Repositories', href: '/repository', icon: BookMarked },
]

const STUDENT_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { label: 'Milestones', href: '/student/milestone', icon: Flag },
  { label: 'Templates', href: '/student/templates', icon: FileText },
  { label: 'Repositories', href: '/repository', icon: BookMarked },
]

function useNavGroups(): NavGroup[] {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'
  if (isAdmin) return [{ label: '', items: ADMIN_ITEMS, show: true }]

  const isFaculty = !!session?.user?.isFaculty
  const isProgramChair = !!session?.user?.isProgramChair
  const isCoordinator = !!session?.user?.isCoordinator
  const isAdviser = !!session?.user?.isAdviser

  if (session?.user?.isStudent) {
    return [{ label: '', items: STUDENT_ITEMS, show: true }]
  }

  if (!isFaculty) {
    return [{ label: '', items: GUEST_ITEMS, show: true }]
  }

  return [
    {
      label: 'General',
      items: [
        { label: 'Dashboard', href: '/faculty', icon: LayoutDashboard },
        { label: 'Repositories', href: '/repository', icon: BookMarked },
      ],
      show: true,
    },
    {
      label: 'Program Chair',
      items: [
        { label: 'Coordinators', href: '/faculty/coordinators', icon: Layers },
        { label: 'Faculties', href: '/faculty/faculties', icon: Users },
      ],
      show: isProgramChair,
    },
    {
      label: 'Adviser',
      items: [
        { label: 'Document Review', href: '/faculty/evaluation', icon: ClipboardCheck },
      ],
      show: isAdviser,
    },
    {
      label: 'Panelist',
      items: [
        { label: 'Defense', href: '/faculty/defense', icon: Shield },
      ],
      show: isFaculty,
    },
    {
      label: 'Coordinator',
      items: [
        { label: 'Defense Scheduling', href: '/faculty/defense-scheduling', icon: CalendarClock },
        { label: 'Templates', href: '/faculty/templates', icon: FileText },
      ],
      show: isCoordinator,
      /** My Sections is rendered separately via SectionsGroup (expandable). */
    },
  ]
}

function isNavActive(pathname: string, href: string) {
  return pathname === href
}

export function NavLinks({
  pathname,
  minimize,
}: {
  pathname: string
  minimize: boolean
}) {
  const groups = useNavGroups()
  const { data: session } = useSession()
  const isCoordinator = !!session?.user?.isCoordinator

  return (
    <div className="flex flex-col">
      {groups
        .filter((g) => g.show)
        .map((group, index) => (
          <div key={group.label}>
            {/* Divider between groups (collapsed only) */}
            {index > 0 && minimize && (
              <div className="border-t border-[#eceef8] mx-2 my-1" />
            )}

            {/* Section header */}
            {!minimize && group.label && (
              <p className="px-[10px] pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#b0b8d4]">
                {group.label}
              </p>
            )}

            {/* Nav items */}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = isNavActive(pathname, item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={minimize ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex items-center h-11 w-full rounded-[10px] pl-[10px] pr-[10px] gap-3 overflow-hidden transition-colors ${
                      isActive
                        ? 'bg-[rgba(112,125,255,0.1)]'
                        : 'hover:bg-[rgba(112,125,255,0.05)]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] rounded-full bg-[#707dff]" />
                    )}

                    <span className="flex items-center justify-center w-5 shrink-0">
                      <Icon
                        size={20}
                        className={`${
                          isActive
                            ? 'text-[#707dff]'
                            : 'text-[#5a6382] group-hover:text-[#707dff]'
                        }`}
                      />
                    </span>

                    <span
                      className={`text-[13px] whitespace-nowrap shrink-0 transition-opacity duration-300 ${
                        minimize ? 'opacity-0' : 'opacity-100'
                      } ${
                        isActive
                          ? 'font-bold text-[#707dff]'
                          : 'font-medium text-[#5a6382] group-hover:text-[#707dff]'
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                )
              })}

              {/* Coordinator's expandable My Sections */}
              {group.label === 'Coordinator' && isCoordinator && (
                <SectionsGroup pathname={pathname} minimize={minimize} />
              )}
            </div>
          </div>
        ))}
    </div>
  )
}
