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
  User,
  UserPlus,
  Layers,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react'
import { SectionsGroup } from './SectionsGroup'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Sections', href: '/admin/sections', icon: Layers },
  { label: 'Templates', href: '/admin/templates', icon: FileText },
  { label: 'Faculty list', href: '/faculty/faculty-list', icon: Users },
  { label: 'Defense', href: '/defense', icon: Shield },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Repository', href: '/repository', icon: BookMarked },
  { label: 'Profile', href: '/account/profile', icon: User },
]

const GUEST_ITEMS: NavItem[] = [
  { label: 'Home', href: '/guest', icon: LayoutDashboard },
  { label: 'Join', href: '/guest/join-archive', icon: UserPlus },
  { label: 'Repository', href: '/repository', icon: BookMarked },
  { label: 'Profile', href: '/account/profile', icon: User },
]

const STUDENT_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { label: 'Milestones', href: '/student/milestone', icon: Flag },
  { label: 'Repository', href: '/repository', icon: BookMarked },
  { label: 'Profile', href: '/account/profile', icon: User },
]

const FACULTY_MEMBER_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/faculty', icon: LayoutDashboard },
  { label: 'Repository', href: '/repository', icon: BookMarked },
  { label: 'Profile', href: '/account/profile', icon: User },
]

const COORDINATOR_ITEMS: NavItem[] = [
  { label: 'Faculty list', href: '/faculty/faculty-list', icon: Users },
  { label: 'Templates', href: '/faculty/templates', icon: FileText },
]

const PROGRAM_CHAIR_ITEMS: NavItem[] = [
  { label: 'Sections', href: '/faculty/sections', icon: Layers },
]

const ADVISER_ITEMS: NavItem[] = [
  { label: 'Evaluation', href: '/faculty/evaluation', icon: ClipboardCheck },
]

function isNavActive(pathname: string, href: string) {
  return pathname === href
}

function useNavItems() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'
  if (isAdmin) return ADMIN_ITEMS

  const items: NavItem[] = []

  if (session?.user?.isStudent) {
    items.push(...STUDENT_ITEMS)
  } else if (session?.user?.isFaculty) {
    items.push(...FACULTY_MEMBER_ITEMS)
    if (session.user.isCoordinator) items.push(...COORDINATOR_ITEMS)
    if (session.user.isProgramChair) items.push(...PROGRAM_CHAIR_ITEMS)
    if (session.user.isAdviser) items.push(...ADVISER_ITEMS)
  } else {
    items.push(...GUEST_ITEMS)
  }

  return items
}

export function NavLinks({
  pathname,
  minimize,
}: {
  pathname: string
  minimize: boolean
}) {
  const items = useNavItems()
  const { data: session } = useSession()
  const isCoordinator = !!session?.user?.isCoordinator
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
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

      {isCoordinator && (
        <SectionsGroup pathname={pathname} minimize={minimize} />
      )}
    </div>
  )
}