'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  FileText,
  Gauge,
  BookMarked,
  Layers,
  ClipboardCheck,
  Shield,
  CalendarClock,
  Calendar,
  Flag,
  Users,
  UserCog,
  UserPlus,
  Archive,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { roleHome } from '@/lib/helper'
import { CountBadge } from '@/components/ui/CountBadge'
import { useIndicatorCounts } from '@/lib/hooks/useIndicatorCounts'
import { isBadgeVisible } from '@/lib/indicators'
import { useIndicators } from '@/store/useIndicators'

type BadgeTone = 'critical' | 'warning' | 'info'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  show: boolean
  /** Key into useIndicatorCounts. Absent key (role not applicable) hides the badge. */
  countKey?: string
  /** Badge turns critical while this key is positive. Defaults to info. */
  criticalKey?: string
  tone?: BadgeTone
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
    href === '/faculty/section-management' ||
    href === '/faculty/archiving'
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
  const isGuest = role === 'GUEST'
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
  // Chairs and admins see program-wide verdict queues on the Defense nav;
  // everyone else sees only their own panelist queue.
  const chairLike = isAdmin || isProgramChair
  const counts = useIndicatorCounts()
  const seen = useIndicators((state) => state.seen)
  const markSeen = useIndicators((state) => state.markSeen)
  const markedPath = useRef<string | null>(null)

  // Seen-semantics: entering a section records its badges' counts as the
  // baseline, hiding them until counts rise above it. Guarded to once per
  // pathname so later refetches while stationary can still re-trigger.
  useEffect(() => {
    if (!counts || markedPath.current === pathname) return
    markedPath.current = pathname
    for (const section of sections) {
      for (const item of section.items) {
        if (isNavActive(pathname, item.href)) {
          if (item.countKey) markSeen(item.countKey, counts[item.countKey] ?? 0)
          if (item.criticalKey) markSeen(item.criticalKey, counts[item.criticalKey] ?? 0)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, counts])

  // Re-baseline downward: work resolved elsewhere must never leave a stale
  // baseline that hides genuinely new items later.
  useEffect(() => {
    if (!counts) return
    for (const [key, value] of Object.entries(counts)) {
      const baseline = seen[key]
      if (baseline != null && value <= baseline) markSeen(key, value)
    }
  }, [counts, seen, markSeen])

  const sections: NavSection[] = [
    {
      label: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: dashboardHref, icon: LayoutDashboard, show: !isGuest && !isStudent },
        // Program Chair gets the program-wide dashboard; everyone else keeps
        // their role home as the dashboard link.
        {
          label: 'Chair Dashboard',
          href: '/faculty/dashboard',
          icon: Gauge,
          show: isProgramChair,
        },
        { label: 'Join Archive', href: '/guest', icon: UserPlus, show: isGuest, countKey: 'invites' },
      ],
    },
    {
      label: 'CAPSTONE',
      items: [
    { label: 'My Team', href: '/student/my-team', icon: Users, show: isStudent, countKey: 'groupInvites' },
    { label: 'Milestones', href: '/student/milestone', icon: Flag, show: isStudent, countKey: 'resubmit' },
        { label: 'My Sections', href: '/faculty/my-sections', icon: Layers, show: isCoordinator, countKey: 'myStaleDefenses', criticalKey: 'myStaleDefenses' },
        { label: 'Document Review', href: '/faculty/document-review', icon: ClipboardCheck, show: isAdviser, countKey: 'adviserQueue' },
        {
          label: 'Defense',
          href: '/faculty/defense',
          icon: Shield,
          show: isFaculty,
          countKey: chairLike ? 'pendingVerdicts' : 'myVerdicts',
          criticalKey: chairLike ? 'staleDefenses' : 'myVerdictsStale',
          tone: 'info',
        },
        { label: 'Defense Scheduling', href: '/faculty/defense-scheduling', icon: CalendarClock, show: isCoordinator },
      ],
    },
    {
      label: 'PROGRAM MANAGEMENT',
      items: [
        {
          label: 'Faculty Management',
          href: '/faculty/faculty-management/members',
          icon: Users,
          show: isAdmin || isCoordinator || isProgramChair,
          countKey: 'advisersAtCap',
          tone: 'warning',
        },
        {
          label: 'Section Management',
          href: '/faculty/section-management',
          icon: Layers,
          show: isAdmin || isCoordinator || isProgramChair,
          countKey: 'unassignedSections',
          criticalKey: 'unassignedSections',
        },
        {
          label: 'Archiving',
          href: '/faculty/archiving',
          icon: Archive,
          show: isAdmin || isProgramChair,
          countKey: 'archivingReview',
          tone: 'warning',
        },
        {
          label: 'Audit Logs',
          href: '/admin/audit',
          icon: ScrollText,
          show: isAdmin,
        },
      ],
    },
    {
      label: 'RESOURCES',
      items: [
        { label: 'Repositories', href: '/repository', icon: BookMarked, show: true },
        { label: 'Calendar', href: '/calendar', icon: Calendar, show: !isGuest },
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
                const rawCount = item.countKey ? (counts?.[item.countKey] ?? 0) : 0
                // Seen-suppressed display count: CountBadge already hides
                // zero, so pass 0 when the section was already opened.
                const count =
                  item.countKey && isBadgeVisible(rawCount, item.countKey ? seen[item.countKey] : undefined)
                    ? rawCount
                    : 0
                // Critical tone follows the same seen-suppression: a stale
                // queue you already opened reads as its base tone, not red.
                const criticalCount = item.criticalKey ? (counts?.[item.criticalKey] ?? 0) : 0
                const tone: BadgeTone =
                  item.criticalKey &&
                  isBadgeVisible(criticalCount, item.criticalKey ? seen[item.criticalKey] : undefined)
                    ? 'critical'
                    : (item.tone ?? 'critical')
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
                    <span className="relative flex items-center justify-center w-5 shrink-0">
                      <Icon
                        size={20}
                        className={`${isActive ? 'text-[#707dff]' : 'text-[#5a6382] group-hover:text-[#707dff]'}`}
                      />
                      {minimize && item.countKey ? (
                        <CountBadge count={count} label={item.label} tone={tone} dot />
                      ) : null}
                    </span>
                    <span
                      className={`text-[13px] whitespace-nowrap shrink-0 transition-opacity duration-300 ${
                        minimize ? 'opacity-0' : 'opacity-100'
                      } ${isActive ? 'font-bold text-[#707dff]' : 'font-medium text-[#5a6382] group-hover:text-[#707dff]'}`}
                    >
                      {item.label}
                    </span>
                    {!minimize && item.countKey ? (
                      <span className="ml-auto shrink-0">
                        <CountBadge count={count} label={item.label} tone={tone} />
                      </span>
                    ) : null}
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
