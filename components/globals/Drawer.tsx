'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useDrawer } from '@/store/useDrawer'
import { NavLinks } from '@/components/globals/Aside/AsideNavLink'
import AsideLogo from '@/components/globals/Aside/AsideLogo'

export default function Drawer() {
  const open = useDrawer((state) => state.show)
  const toggle = useDrawer((state) => state.toggleShow)
  const setShow = useDrawer((state) => state.setShow)
  const pathname = usePathname()

  // Close on navigation. The store isn't persisted, so a client-side route
  // change leaves the panel open over the new page. Tracked via a ref so this
  // fires on pathname changes only — never when the drawer is merely opened.
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname
    setShow(false)
  }, [pathname, setShow])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 md:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggle}
      />

      {/* Drawer panel — same surface as the desktop sidebar */}
      <div
        className={`fixed top-0 left-0 h-dvh w-[240px] z-30 bg-white border-r border-[#eceef8] md:hidden flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AsideLogo
          trailing={
            <button
              onClick={toggle}
              aria-label="Close navigation"
              className="bg-white border border-[#dddff0] rounded-[15px] size-7 flex items-center justify-center shadow-[0px_1px_1.5px_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors shrink-0"
            >
              <X size={13} className="text-[#5a6382]" />
            </button>
          }
        />

        {/* Nav — same component as the desktop sidebar */}
        <nav className="flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} minimize={false} />
        </nav>
      </div>
    </>
  )
}
