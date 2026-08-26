'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
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

const FILTER_OPTIONS: { value: FacultyFilter; label: string }[] = [
  { value: 'all', label: 'All Faculty' },
  { value: 'advisers', label: 'Advisers' },
  { value: 'coordinators', label: 'Coordinators' },
  { value: 'non-advisers', label: 'Non-advisers' },
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
  const [filterOpen, setFilterOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<FacultyMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const [sortField, setSortField] = useState<SortKey>('activity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getFacultyMembers().then((res) => {
      setRaw(res.payload ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const selectedFilterLabel =
    filterOptions.find((o) => o.value === filter)?.label ?? 'All Faculty'

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 pb-[15px] pt-[14px] px-5 border-b border-[#f0f2fa]">
        <div className="relative flex-[0_0_320px] max-w-[320px] min-w-[180px]">
          <Search className="absolute left-[12.5px] top-1/2 -translate-y-1/2 size-[10px] text-[#8a93b4]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty…"
            className="w-full h-[37.5px] pl-[33px] pr-[13px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-medium text-[13px] text-[rgba(16,19,58,0.5)] placeholder:text-[rgba(16,19,58,0.5)] outline-none"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex gap-[7px] items-center h-[37.5px] px-[14px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-semibold text-[13px] text-[#5a6382]"
          >
            {selectedFilterLabel}
            <ChevronDown className="size-[13px]" />
          </button>
          {filterOpen && (
            <div className="absolute left-0 top-full z-10 pt-1">
              <div className="bg-white border border-[#eceef8] rounded-[10px] w-[148px] py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]">
                {filterOptions.map((option, index) => (
                  <div key={option.value}>
                    {index > 0 && <div className="mx-[10px] h-px bg-[#f0f2fa]" />}
                    <button
                      onClick={() => {
                        setFilter(option.value)
                        setFilterOpen(false)
                      }}
                      className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                        filter === option.value
                          ? 'text-[#707dff]'
                          : 'text-[#3d4566]'
                      }`}
                    >
                      {option.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex justify-end gap-[10px]">
          {viewerCanManage && <CopyJoinCode />}
        </div>
      </div>

      {loading ? (
        <FacultyTableSkeleton
          manageMode={session?.user ? viewerCanManage : true}
        />
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

      <FacultyProfileDrawer />
      <RemoveFacultyModal
        isOpen={!!removeTarget}
        memberName={removeTarget?.name ?? ''}
        memberEmail={removeTarget?.email ?? ''}
        isLoading={removing}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
