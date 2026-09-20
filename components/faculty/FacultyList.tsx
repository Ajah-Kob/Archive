'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { SearchBar } from '@/components/ui/SearchBar'
import { FacultyTable, type FacultyMember } from './FacultyTable'
import { CopyJoinCode } from '@/components/faculty/CopyJoinCode'
import { FacultyProfileDrawer } from '@/components/faculty/drawer/FacultyProfileDrawer'
import { RemoveFacultyModal } from '@/components/faculty/modal/RemoveFacultyModal'
import { useFacultyDrawer } from '@/store/useFacultyDrawer'
import { getInitials } from '@/lib/helper'
import { getFacultyMembers, removeFaculty } from '@/lib/actions/faculty'
import { FacultyTableSkeleton } from '@/components/faculty/FacultyTableSkeleton'
import { ADVISER_CAP } from '@/config/constants'

interface RawMember {
  id: number
  userId: number
  name: string
  email: string
  avatarGradient: string
  loggedInAt: Date | null
  activityStatus: 'active' | string
  isAdviser: boolean
  isCoordinator: boolean
  groupCount: number
  sectionsManaged: number
}

type SortKey = 'name' | 'activity' | 'workload'

export function FacultyList({ advisersOnly = false }: { advisersOnly?: boolean }) {
  const { data: session } = useSession()
  const viewerCanManage =
    session?.user?.role === 'SUPERADMIN' ||
    session?.user?.role === 'ADMIN' ||
    !!session?.user?.isProgramChair

  const openFacultyDrawer = useFacultyDrawer((s) => s.open)
  const [raw, setRaw] = useState<RawMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [removeTarget, setRemoveTarget] = useState<FacultyMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const [sortField, setSortField] = useState<SortKey>('activity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    getFacultyMembers().then((res) => {
      setRaw(res.payload ?? [])
      setLoading(false)
    })
  }, [])

  const handleSort = (field: SortKey) => {
    setSortDir((prev) =>
      sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'desc',
    )
    setSortField(field)
  }

  const faculty = useMemo<FacultyMember[]>(() => {
    const term = search.trim().toLowerCase()
    const filtered = raw.filter((m) => {
      if (advisersOnly && !m.isAdviser) return false
      if (
        term &&
        !m.name.toLowerCase().includes(term) &&
        !m.email.toLowerCase().includes(term)
      ) {
        return false
      }
      return true
    })

    filtered.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'activity': {
          const ta = a.loggedInAt ? new Date(a.loggedInAt).getTime() : 0
          const tb = b.loggedInAt ? new Date(b.loggedInAt).getTime() : 0
          cmp = ta - tb
          break
        }
        case 'workload':
          cmp = a.groupCount - b.groupCount
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return filtered.map((m) => ({
        id: m.id,
        userId: m.userId,
        initials: getInitials(m.name),
        name: m.name,
        email: m.email,
        avatarGradient: (m as any).avatarGradient,
        activityStatus: m.activityStatus,
        workload: { current: m.groupCount, max: ADVISER_CAP },
        isCoordinator: m.isCoordinator,
        sectionsManaged: m.sectionsManaged,
      }))
  }, [raw, search, sortField, sortDir, advisersOnly])

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    const res = await removeFaculty(removeTarget.id)
    if (res.success) {
      toast.success(res.message)
      setRemoveTarget(null)
      setRaw((prev) => prev.filter((m) => m.id !== removeTarget.id))
    } else {
      toast.error(res.message)
    }
    setRemoving(false)
  }

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="w-full flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[10px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
          {loading ? (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="h-[37.5px] w-[320px] rounded-lg bg-[#dfe3fb] animate-pulse" />
              </div>
              <div className="h-[37.5px] w-[150px] rounded-[9px] bg-[#dfe3fb] animate-pulse" />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder={
                    advisersOnly ? 'Search advisers…' : 'Search faculty…'
                  }
                  ariaLabel={
                    advisersOnly ? 'Search advisers' : 'Search faculty'
                  }
                  className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
                />
              </div>
              {viewerCanManage && !advisersOnly ? <CopyJoinCode /> : null}
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 pt-[16px] px-8 pb-[30px] flex flex-col">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            {loading ? (
              <FacultyTableSkeleton />
            ) : (
              <FacultyTable
                faculty={faculty}
                emptyMessage={
                  advisersOnly
                    ? 'No advisers found.'
                    : raw.length === 0
                      ? 'No faculty have joined yet. Faculty join using the faculty invite code.'
                      : 'No faculty match your search.'
                }
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                onViewDetails={(member) => openFacultyDrawer(member.id)}
                onRemove={setRemoveTarget}
                manageMode={viewerCanManage}
                viewerUserId={session?.user?.id ? Number(session.user.id) : null}
              />
            )}
          </div>
        </div>
      </div>

      <FacultyProfileDrawer />
      <RemoveFacultyModal
        isOpen={!!removeTarget}
        memberName={removeTarget?.name ?? ''}
        memberEmail={removeTarget?.email ?? ''}
        isLoading={removing}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  )
}
