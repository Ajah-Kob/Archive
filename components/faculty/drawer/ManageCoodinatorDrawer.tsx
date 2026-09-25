'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AvailableFacultyList } from '@/components/faculty/drawer/AvaiableFacultyList'
import { AvailableFacultySkeleton } from '@/components/faculty/drawer/AvailableFacultySkeleton'
import { Drawer } from '@/components/ui/Drawer'
import { useCoordinatorDrawer } from '@/store/useCoordinatorDrawer'
import { getInitials } from '@/lib/helper'
import { getAvailableFaculty } from '@/lib/actions/faculty'

interface DrawerData {
  availableFaculty: FacultyRaw[]
}

export interface FacultyRaw {
  id: number
  isProgramChair: boolean
  user: { id: number; name: string; email: string; image: string | null; avatarGradient: string }
}

export function ManageCoodinatorDrawer() {
  const { isOpen, close } = useCoordinatorDrawer()
  const [data, setData] = useState<DrawerData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    async function loadDrawerData() {
      if (cancelled) return
      setLoading(true)
      setData(null)
      const facultyRes = await getAvailableFaculty()
      if (cancelled) return
      if (!facultyRes.success) toast.error(facultyRes.message)
      setData({ availableFaculty: facultyRes.payload ?? [] })
      setLoading(false)
    }

    queueMicrotask(() => {
      if (!cancelled) void loadDrawerData()
    })

    return () => {
      cancelled = true
    }
  }, [isOpen])

  const availableFacultyList = useMemo(
    () =>
      (data?.availableFaculty ?? []).map((faculty) => ({
        id: faculty.id,
        initials: getInitials(faculty.user.name),
        name: faculty.user.name,
        email: faculty.user.email,
        gradient: faculty.user.avatarGradient,
        isProgramChair: faculty.isProgramChair,
      })),
    [data?.availableFaculty],
  )

  return (
    <Drawer open={isOpen} onClose={close} size="sm">
      <Drawer.Header
        title="Manage Coordinators"
        subtitle="Assign faculty to coordinate sections."
      />
      <Drawer.Body>
        <div className="flex flex-col px-6">
          {loading ? (
            <AvailableFacultySkeleton />
          ) : (
            <AvailableFacultyList data={availableFacultyList} />
          )}
        </div>
      </Drawer.Body>
    </Drawer>
  )
}
