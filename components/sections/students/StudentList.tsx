'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { StudentTable, type StudentSortKey } from './StudentTable'
import type { StudentData } from './StudentDataRow'

type GroupFilter = 'all' | 'none' | string

export function StudentList({ students }: { students: StudentData[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<GroupFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortField, setSortField] = useState<StudentSortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSort = (field: StudentSortKey) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir(field === 'name' ? 'asc' : 'desc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  const groupNames = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.group?.name).filter((n) => !!n) as string[]),
      ),
    [students],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = students.filter((s) => {
      if (filter === 'none' && s.group) return false
      if (filter !== 'all' && filter !== 'none' && s.group?.name !== filter) {
        return false
      }
      if (
        term &&
        !s.name.toLowerCase().includes(term) &&
        !s.email.toLowerCase().includes(term)
      ) {
        return false
      }
      return true
    })

    rows.sort((a, b) => {
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

    return rows
  }, [students, search, filter, sortField, sortDir])

  const selectedFilterLabel =
    filter === 'all'
      ? 'All Groups'
      : filter === 'none'
        ? 'No Group'
        : filter

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 pb-[15px] pt-[14px] px-5 border-b border-[#f0f2fa]">
        <div className="relative flex-[0_0_320px] max-w-[320px] min-w-[180px]">
          <Search className="absolute left-[12.5px] top-1/2 -translate-y-1/2 size-[10px] text-[#8a93b4]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
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
              <div className="bg-white border border-[#eceef8] rounded-[10px] w-[168px] py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]">
                <button
                  onClick={() => {
                    setFilter('all')
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                    filter === 'all' ? 'text-[#707dff]' : 'text-[#3d4566]'
                  }`}
                >
                  All Groups
                </button>
                {groupNames.length > 0 && (
                  <>
                    <div className="mx-[10px] h-px bg-[#f0f2fa]" />
                    {groupNames.map((name) => (
                      <div key={name}>
                        <button
                          onClick={() => {
                            setFilter(name)
                            setFilterOpen(false)
                          }}
                          className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                            filter === name ? 'text-[#707dff]' : 'text-[#3d4566]'
                          }`}
                        >
                          {name}
                        </button>
                      </div>
                    ))}
                  </>
                )}
                <div className="mx-[10px] h-px bg-[#f0f2fa]" />
                <button
                  onClick={() => {
                    setFilter('none')
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-[14px] py-[9px] font-sans font-semibold text-[13px] hover:bg-[#fafbff] transition-colors ${
                    filter === 'none' ? 'text-[#707dff]' : 'text-[#3d4566]'
                  }`}
                >
                  No Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <StudentTable
        students={filtered}
        emptyMessage={
          students.length === 0
            ? 'No students in this section yet.'
            : 'No students match your search or filter.'
        }
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
      />
    </div>
  )
}
