'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { FacultyTable, type FacultyMember } from './FacultyTable'
import { CopyJoinCode } from '@/components/faculty/CopyJoinCode'
import { FacultyProfileDrawer } from '@/components/faculty/drawer/FacultyProfileDrawer'
import { RemoveFacultyModal } from '@/components/faculty/modal/RemoveFacultyModal'
import { useFacultyDrawer } from '@/store/useFacultyDrawer'
import { getInitials } from '@/lib/helper'
import { getFacultyMembers, removeFaculty } from '@/lib/actions/faculty'
import { FacultyTableSkeleton } from '@/components/faculty/FacultyTableSkeleton'
import { ADVISER_CAP } from '@/config/constants'

type FacultyFilter = 'all' | 'advisers' | 'coordinators' | 'non-advisers'

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Faculty' },
  { value: 'advisers', label: 'Advisers', dividerBefore: true },
  { value: 'coordinators', label: 'Coordinators', dividerBefore: true },
  { value: 'non-advisers', label: 'Non-advisers', dividerBefore: true },
]

const gradients = [
  'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
  'linear-gradient(135deg, #fe6f6f 0%, #f87c7c 55%, #ff9e9e 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #e08800 55%, #c47a00 100%)',
]

interface RawMember {
  id: number
  userId: number
  name: string
  email: string
  loggedInAt: Date | null
  activityStatus: 'active' | string
  isAdviser: boolean
  isCoordinator: boolean
  groupCount: number
  sectionsManaged: number
}

type SortKey = 'name' | 'activity' | 'workload' | 'coordinator'

export function FacultyList() {
  const { data: session } = useSession()
  const viewerCanManage =
    session?.user?.role === 'SUPERADMIN' ||
    session?.user?.role === 'ADMIN' ||
    !!session?.user?.isProgramChair

  const filterOptions = viewerCanManage
    ? FILTER_OPTIONS
    : FILTER_OPTIONS.filter((o) => o.value !== 'coordinators')

  const openFacultyDrawer = useFacultyDrawer((s) => s.open)
  const [raw, setRaw] = useState<RawMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FacultyFilter>('all')
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
      if (filter === 'advisers' && !m.isAdviser) return false
      if (filter === 'coordinators' && !m.isCoordinator) return false
      if (filter === 'non-advisers' && m.isAdviser) return false
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
        case 'coordinator':
          cmp = a.sectionsManaged - b.sectionsManaged
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
        avatarGradient: gradients[m.id % gradients.length],
        activityStatus: m.activityStatus,
        workload: { current: m.groupCount, max: ADVISER_CAP },
        isCoordinator: m.isCoordinator,
        sectionsManaged: m.sectionsManaged,
      }))
  }, [raw, search, filter, sortField, sortDir])

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
        <HeaderBar actions={viewerCanManage ? <CopyJoinCode /> : undefined}>
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search faculty…"
              ariaLabel="Search faculty"
              className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
            />
            <Filter
              value={filter}
              options={filterOptions}
              onChange={(v) => setFilter(v as FacultyFilter)}
              ariaLabel="Filter faculty"
            />
          </div>
        </HeaderBar>

        <div className="flex-1 min-h-0 pt-[16px] px-8 pb-[30px] flex flex-col">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            {loading ? (
              <FacultyTableSkeleton manageMode={session?.user ? viewerCanManage : true} />
            ) : (
              <FacultyTable
                faculty={faculty}
                emptyMessage={
                  raw.length === 0
                    ? 'No faculty have joined yet. Faculty join using the faculty invite code.'
                    : 'No faculty match your search or filter.'
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
