'use client'

import { useEffect } from 'react'
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
  // change leaves the panel open over the new page.
  //
  // No ref guard: this effect only depends on `pathname` (setShow is a stable
  // Zustand setter), so opening or closing the drawer never re-runs it. The
  // ref was actively harmful -- on a cross-layout navigation the Drawer
  // remounts, the ref initialises to the *new* pathname, the guard bails, and
  // the store's `show: true` survives, so the drawer arrives open. Firing
  // unconditionally covers both the remount and the in-layout case.
  useEffect(() => {
    setShow(false)
  }, [pathname, setShow])

  return (
    <>
      {/* Backdrop */}
      {/* z-[45], above the floating action buttons at z-40 but below the modal
          overlays at z-50. The FABs are `fixed`, so a backdrop any lower left
          them sitting undimmed and still tappable over the open drawer — the
          backdrop also swallows their clicks once it is above them. */}
      <div
        className={`fixed inset-0 z-[45] bg-black/50 lg:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggle}
      />

      {/* Drawer panel — same surface as the desktop sidebar */}
      <div
        className={`fixed top-0 left-0 h-dvh w-[240px] z-[45] bg-white border-r border-[#eceef8] lg:hidden flex flex-col transition-transform duration-300 ${
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
