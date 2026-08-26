'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ButtonSignOut } from '@/components/ButtonsAuth'
import {
  LayoutDashboard,
  ShieldEllipsis,
  UserPen,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getInitials } from '@/lib/helper'

export default function DrawerProfile() {
  // Ref
  const drawerRef = useRef<HTMLDivElement>(null)

  // Hooks
  const { data: session } = useSession()

  // State
  const [isOpen, setIsOpen] = useState(false)

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const name = session?.user?.name || 'User'
  const initials = session?.user?.name ? getInitials(session.user.name) : '?'

  const avatar = session?.user?.image ? (
    <Image
      src={session.user.image}
      alt="Profile"
      width={40}
      height={40}
      className="size-10 object-cover"
    />
  ) : (
    <div
      className="size-full flex items-center justify-center"
      style={{
        backgroundImage:
          'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
      }}
    >
      <span className="text-white text-[12.5px] font-bold tracking-[0.5px]">
        {initials}
      </span>
    </div>
  )

  const menuLinkClass =
    'flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] font-medium text-[#3c4268] hover:bg-[#f4f6ff] hover:text-[#12143a] transition-colors'

  return (
    <div className="relative" ref={drawerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile"
        className="size-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-[#eceef8] shadow-[0px_2px_4px_rgba(0,0,0,0.14)] hover:opacity-90 transition-opacity"
      >
        {avatar}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_20px_60px_0px_rgba(16,20,58,0.18),0px_4px_16px_0px_rgba(0,0,0,0.06)] z-50">
          <div className="px-3 pt-3 pb-[13px] border-b border-[#eceef8]">
            <div className="flex gap-3 items-center">
              <div className="size-10 rounded-full overflow-hidden shrink-0">
                {avatar}
              </div>
              <div className="min-w-px flex flex-col">
                <p className="font-sans font-bold text-[13.5px] text-[#12143a] truncate">
                  {name}
                </p>
                <p className="font-sans font-medium text-[11.5px] text-[#8a93b4] truncate">
                  {session?.user?.email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5 flex flex-col gap-0.5">
            {(session?.user?.role === 'SUPERADMIN' ||
              session?.user?.role === 'ADMIN') && (
              <Link
                href="/admin"
                className={menuLinkClass}
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard className="size-4 text-[#9ea8c6] shrink-0" />
                Dashboard
              </Link>
            )}

            <Link
              href="/account/profile"
              className={menuLinkClass}
              onClick={() => setIsOpen(false)}
            >
              <UserPen className="size-4 text-[#9ea8c6] shrink-0" />
              Profile
            </Link>

            <Link
              href="/account/security"
              className={menuLinkClass}
              onClick={() => setIsOpen(false)}
            >
              <ShieldEllipsis className="size-4 text-[#9ea8c6] shrink-0" />
              Security
            </Link>

            <div className="pt-1.5 mt-0.5 border-t border-[#eceef8]">
              <ButtonSignOut />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
