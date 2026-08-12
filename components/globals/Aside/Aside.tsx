'use client'

import AsideLogo from '@/components/globals/Aside/AsideLogo'
import { useAside } from '@/store/useAside'
import { usePathname } from 'next/navigation'
import { NavLinks } from '@/components/globals/Aside/AsideNavLink'

export default function Aside() {
  const minimize = useAside((state) => state.minimize)
  const pathname = usePathname()

  return (
    // Sidebar container
    <aside
      className={`hidden md:flex flex-col bg-white border-r border-[#eceef8] transition-all duration-300 ${
        minimize ? 'w-[64px]' : 'w-[240px]'
      }`}
    >
      {/* Logo + collapse button */}
      <AsideLogo />
      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto p-3">
        <NavLinks pathname={pathname} minimize={minimize} />
      </nav>
    </aside>
  )
}
