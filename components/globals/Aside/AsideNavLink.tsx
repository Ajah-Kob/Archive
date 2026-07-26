'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Flag,
  Shield,
  Calendar,
  BookMarked,
  User,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Faculty', href: '/faculty', icon: Users },
  { label: 'Milestones', href: '/milestones', icon: Flag },
  { label: 'Defense', href: '/defense', icon: Shield },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Repository', href: '/repository', icon: BookMarked },
  { label: 'Profile', href: '/dashboard/user/profile', icon: User },
]

export function CollapsedNavLink({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center justify-center h-10 w-full rounded-[10px] transition-colors ${
              isActive
                ? 'bg-[rgba(112,125,255,0.1)]'
                : 'hover:bg-[rgba(112,125,255,0.05)]'
            }`}
          >

            {isActive && (
              <span className="absolute left-0 w-1 h-5 bg-[#707dff] rounded-r-[3px]" />
            )}

            <Icon
              size={20}
              className={`${
                isActive
                  ? 'text-[rgb(112,125,255)]'
                  : 'text-[rgb(90,99,130)] group-hover:text-[rgb(112,125,255)]'
              }`}
            />
          </Link>
        )
      })}
    </div>
  )
}

export function ExpandedNavLink({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center h-10 w-full rounded-[10px] px-4 transition-colors gap-3 ${
              isActive
                ? 'bg-[rgba(112,125,255,0.1)]'
                : 'hover:bg-[rgba(112,125,255,0.05)]'
            }`}
          >

            {isActive && (
              <span className="absolute left-0 w-1 h-5 bg-[#707dff] rounded-r-[3px]" />
            )}

            <div className="flex items-center justify-center shrink-0">
              <Icon
                size={20}
                className={`${isActive ? 'text-[#707dff]' : 'text-[#5a6382] group-hover:text-[#707dff] '}`}
              />
            </div>

            <div>
              <span
                className={`text-[13px] whitespace-nowrap ${
                  isActive
                    ? 'font-bold text-[#707dff]'
                    : 'font-medium text-[#5a6382] group-hover:text-[#707dff]'
                }`}
              >
                {item.label}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
