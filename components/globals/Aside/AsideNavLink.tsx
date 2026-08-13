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
  type LucideIcon,
} from 'lucide-react'
import { SectionsGroup } from './SectionsGroup'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Join', href: '/join-archive', icon: UserPlus },
  { label: 'Faculty', href: '/faculty', icon: Users },
  { label: 'Sections', href: '/sections', icon: Layers },
  { label: 'Templates', href: '/templates', icon: FileText },
  { label: 'Milestones', href: '/milestone', icon: Flag },
  { label: 'Defense', href: '/defense', icon: Shield },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Repository', href: '/repository', icon: BookMarked },
  { label: 'Profile', href: '/dashboard/user/profile', icon: User },
]

const GUEST_ALLOWED = new Set([
  '/join-archive',
  '/repository',
  '/dashboard/user/profile',
])

const MEMBER_ALLOWED = new Set([
  '/dashboard',
  '/repository',
  '/dashboard/user/profile',
])

const STUDENT_ALLOWED = new Set([...MEMBER_ALLOWED, '/milestone'])

const COORDINATOR_ALLOWED = new Set([
  '/dashboard',
  '/faculty',
  '/templates',
  '/repository',
  '/dashboard/user/profile',
])

const PROGRAM_CHAIR_ALLOWED = new Set([
  '/dashboard',
  '/faculty',
  '/sections',
  '/templates',
  '/repository',
  '/dashboard/user/profile',
])

function isNavActive(pathname: string, href: string) {
  return pathname === href
}

function useNavItems() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'
  if (isAdmin) return navItems
  if (session?.user?.isProgramChair) {
    return navItems.filter((item) => PROGRAM_CHAIR_ALLOWED.has(item.href))
  }
  if (session?.user?.isCoordinator) {
    return navItems.filter((item) => COORDINATOR_ALLOWED.has(item.href))
  }
  if (session?.user?.isStudent) {
    return navItems.filter((item) => STUDENT_ALLOWED.has(item.href))
  }
  if (session?.user?.isFaculty) {
    return navItems.filter((item) => MEMBER_ALLOWED.has(item.href))
  }
  return navItems.filter((item) => GUEST_ALLOWED.has(item.href))
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
