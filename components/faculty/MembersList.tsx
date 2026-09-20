'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { SearchBar } from '@/components/ui/SearchBar'
import { CopyJoinCode } from '@/components/faculty/CopyJoinCode'
import { MembersTable, type MemberRow, type SortKey } from './MembersTable'
import { MembersTableSkeleton } from './MembersTableSkeleton'
import { FacultyProfileDrawer } from '@/components/faculty/drawer/FacultyProfileDrawer'
import { useFacultyDrawer } from '@/store/useFacultyDrawer'
import { getInitials } from '@/lib/helper'
import { getFacultyMembers } from '@/lib/actions/faculty'

interface RawMember {
  id: number
  userId: number
  name: string
  email: string
  avatarGradient: string
  loggedInAt: Date | null
  activityStatus: 'active' | string
}

export function MembersList() {
  const { data: session } = useSession()
  const viewerCanManage =
    session?.user?.role === 'SUPERADMIN' ||
    session?.user?.role === 'ADMIN' ||
    !!session?.user?.isProgramChair

  const openFacultyDrawer = useFacultyDrawer((s) => s.open)
  const [raw, setRaw] = useState<RawMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    getFacultyMembers().then((res) => {
      setRaw(res.payload ?? [])
      setLoading(false)
    })
  }, [])

  const handleSort = (field: SortKey) => {
    setSortDir((prev) =>
      sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc',
    )
    setSortField(field)
  }

  const members = useMemo<MemberRow[]>(() => {
    const term = search.trim().toLowerCase()
    const filtered = raw.filter(
      (m) =>
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term),
    )

    filtered.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else {
        const ta = a.loggedInAt ? new Date(a.loggedInAt).getTime() : 0
        const tb = b.loggedInAt ? new Date(b.loggedInAt).getTime() : 0
        cmp = ta - tb
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return filtered.map((m) => ({
      id: m.id,
      userId: m.userId,
      initials: getInitials(m.name),
      name: m.name,
      email: m.email,
      avatarGradient: m.avatarGradient,
      activityStatus: m.activityStatus,
    }))
  }, [raw, search, sortField, sortDir])

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="w-full flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[10px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
          {loading ? (
            <>
              <div className="h-[37.5px] w-[320px] rounded-lg bg-[#dfe3fb] animate-pulse" />
              <div className="h-[37.5px] w-[150px] rounded-[9px] bg-[#dfe3fb] animate-pulse" />
            </>
          ) : (
            <>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search members…"
                ariaLabel="Search members"
                className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
              />
              {viewerCanManage ? <CopyJoinCode /> : null}
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 pt-[16px] px-8 pb-[30px] flex flex-col">
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            {loading ? (
              <MembersTableSkeleton />
            ) : (
              <MembersTable
                members={members}
                emptyMessage={
                  raw.length === 0
                    ? 'No faculty have joined yet. Faculty join using the faculty invite code.'
                    : 'No members match your search.'
                }
                onSelect={(facultyId) => openFacultyDrawer(facultyId)}
                onRemoved={(facultyId) =>
                  setRaw((prev) => prev.filter((m) => m.id !== facultyId))
                }
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                viewerUserId={
                  session?.user?.id ? Number(session.user.id) : null
                }
              />
            )}
          </div>
        </div>
      </div>

      <FacultyProfileDrawer />
    </>
  )
}
