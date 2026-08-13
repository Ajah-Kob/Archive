'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AvailableFacultyList } from '@/components/faculty/drawer/AvaiableFacultyList'
import { DrawerSkeleton } from '@/components/faculty/drawer/DrawerSkeleton'
import { AssignedCoordinatorList } from '@/components/faculty/drawer/AssignedCoordinatorList'
import { DrawerHeader } from '@/components/faculty/drawer/DrawerHeader'
import { useCoordinatorDrawer } from '@/store/useCoordinatorDrawer'
import { getInitials } from '@/lib/helper'
import { getCoordinators } from '@/lib/actions/coordinator'
import { getAvailableFaculty } from '@/lib/actions/faculty'
import { getPendingCoordinatorInvitations } from '@/lib/actions/invitation'

interface DrawerData {
  coordinators: CoordinatorRaw[]
  availableFaculty: FacultyRaw[]
  pendingInvitations: PendingInvitation[]
}

export interface CoordinatorRaw {
  id: number
  faculty: {
    id: number
    user: { id: number; name: string; email: string; image: string | null }
  }
  _count: { section: number }
}

export interface FacultyRaw {
  id: number
  user: { id: number; name: string; email: string; image: string | null }
}

interface PendingInvitation {
  id: number
  facultyId: number
}

const gradients = [
  'linear-gradient(135deg, #fe6f6f, #e85555)',
  'linear-gradient(135deg, #f59e0b, #e08800)',
  'linear-gradient(135deg, #22c55e, #16a34a)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #707dff, #5565ff)',
]

export function ManageCoodinatorDrawer() {
  const { isOpen, close } = useCoordinatorDrawer()
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    Promise.all([
      getCoordinators(),
      getAvailableFaculty(),
      getPendingCoordinatorInvitations('COORDINATOR'),
    ]).then(([coordsRes, facultyRes, invitesRes]) => {
      if (!coordsRes.success) toast.error(coordsRes.message)
      if (!facultyRes.success) toast.error(facultyRes.message)
      if (!invitesRes.success) toast.error(invitesRes.message)
      setData({
        coordinators: coordsRes.payload ?? [],
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

  const handleCoordinatorRemoved = (id: number) => {
    setData((prev) => {
      if (!prev) return prev
      const removed = prev.coordinators.find((c) => c.id === id)
      if (!removed) return prev
      return {
        ...prev,
        coordinators: prev.coordinators.filter((c) => c.id !== id),
        availableFaculty: [
          ...prev.availableFaculty.filter((f) => f.id !== removed.faculty.id),
          removed.faculty,
        ],
      }
    })
  }

  const assignedCoordinatorList = useMemo(
    () =>
      (data?.coordinators ?? []).map((coordinator, i) => ({
        id: coordinator.id,
        initials: getInitials(coordinator.faculty.user.name),
        name: coordinator.faculty.user.name,
        email: coordinator.faculty.user.email,
        gradient: gradients[i % gradients.length],
        sections: coordinator._count.section,
      })),
    [data?.coordinators],
  )

  const availableFacultyList = useMemo(
    () =>
      (data?.availableFaculty ?? []).map((faculty, i) => ({
        id: faculty.id,
        initials: getInitials(faculty.user.name),
        name: faculty.user.name,
        email: faculty.user.email,
        gradient: gradients[i % gradients.length],
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
            <DrawerSkeleton />
          ) : (
            <>
              <AssignedCoordinatorList
                data={assignedCoordinatorList}
                onRemoved={handleCoordinatorRemoved}
              />

              <div className="self-stretch h-px bg-slate-100 shrink-0" />

              <AvailableFacultyList
                data={availableFacultyList}
                pendingInvitations={data?.pendingInvitations ?? []}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
