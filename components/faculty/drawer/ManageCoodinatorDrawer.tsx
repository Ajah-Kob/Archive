'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AvailableFacultyList } from '@/components/faculty/drawer/AvaiableFacultyList'
import { AvailableFacultySkeleton } from '@/components/faculty/drawer/AvailableFacultySkeleton'
import { DrawerHeader } from '@/components/faculty/drawer/DrawerHeader'
import { useCoordinatorDrawer } from '@/store/useCoordinatorDrawer'
import { getInitials } from '@/lib/helper'
import { getAvailableFaculty } from '@/lib/actions/faculty'
import { getPendingCoordinatorInvitations } from '@/lib/actions/invitation'

interface DrawerData {
  availableFaculty: FacultyRaw[]
  pendingInvitations: PendingInvitation[]
}

export interface FacultyRaw {
  id: number
  user: { id: number; name: string; email: string; image: string | null; avatarGradient: string }
}

interface PendingInvitation {
  id: number
  facultyId: number
}

export function ManageCoodinatorDrawer() {
  const { isOpen, close } = useCoordinatorDrawer()
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    Promise.all([
      getAvailableFaculty(),
      getPendingCoordinatorInvitations('COORDINATOR'),
    ]).then(([facultyRes, invitesRes]) => {
      if (!facultyRes.success) toast.error(facultyRes.message)
      if (!invitesRes.success) toast.error(invitesRes.message)
      setData({
        availableFaculty: facultyRes.payload ?? [],
        pendingInvitations: invitesRes.payload ?? [],
      })
      setLoading(false)
    })
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, close])

  const availableFacultyList = useMemo(
    () =>
      (data?.availableFaculty ?? []).map((faculty) => ({
        id: faculty.id,
        initials: getInitials(faculty.user.name),
        name: faculty.user.name,
        email: faculty.user.email,
        gradient: (faculty.user as any).avatarGradient,
      })),
    [data?.availableFaculty],
  )

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] transition-all duration-300 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />
      <div
        className={`fixed top-0 right-0 h-dvh w-[500px] z-50 bg-white shadow-[0_0_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <DrawerHeader />
        <div className="flex flex-col px-6 overflow-y-auto h-[calc(100dvh-57px)]">
          {loading ? (
            <AvailableFacultySkeleton />
          ) : (
            <AvailableFacultyList
              data={availableFacultyList}
              pendingInvitations={data?.pendingInvitations ?? []}
            />
          )}
        </div>
      </div>
    </>
  )
}
