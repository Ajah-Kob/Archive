'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'
import { PageLabel } from '@/components/globals/PageLabel'
import { ScrollFadeRegion } from '@/components/ui/ScrollFadeRegion'
import UsersToolbar, {
  type FiltersState,
} from '@/components/features/users/main/UsersToolbar'
import UsersTable, { type UserItem } from '@/components/features/users/main/UsersTable'
import AddUserModal from '@/components/features/users/modal/AddUserModal'
import EditUserModal from '@/components/features/users/modal/EditUserModal'
import DeleteUserModal from '@/components/features/users/modal/DeleteUserModal'
import ConfirmChairModal from '@/components/features/users/modal/ConfirmChairModal'
import { getUsers } from '@/lib/actions/user'

// Client-side sorting needs the full filtered set in memory. Bounded so a
// huge user base can't OOM the browser — past this, narrow with filters.
// ponytail: full-fetch ceiling; upgrade path is server-side sort + keyset
// pagination if user volume outgrows it.
const CLIENT_FETCH_LIMIT = 2000

function sortValue(user: UserItem, field: string): string | number {
  if (field === 'id') return user.id
  if (field === 'chair') return user.isProgramChair ? 1 : 0
  if (field === 'createdAt') return new Date(user.createdAtRaw).getTime()
  const v = (user as unknown as Record<string, unknown>)[field]
  return (v ?? '').toString()
}

export default function DashboardUsersPage() {
  const { data: session } = useSession()

  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FiltersState>({
    searchTerm: '',
    roleFilter: '',
    dateFrom: '',
    dateTo: '',
    perPage: 10,
  })
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Modal state
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [chairConfirmTarget, setChairConfirmTarget] = useState<UserItem | null>(
    null,
  )

  const mapUser = useCallback(
    (u: any): UserItem => ({
      id: u.id,
      name: u.name,
      honorific: u.faculty?.honorific ?? null,
      avatarGradient: u.avatarGradient ?? null,
      email: u.email,
      role: u.role,
      isProgramChair: u.faculty?.isProgramChair ?? false,
      createdAt: new Date(u.createdAt).toLocaleDateString(),
      createdAtRaw: new Date(u.createdAt).toISOString(),
    }),
    [],
  )

  // Backend only supplies the filtered set — sort + pagination stay in memory
  const fetchUsers = useCallback(
    async (opts?: {
      search?: string
      role?: string
      df?: string
      dt?: string
    }) => {
      const s = opts?.search ?? filters.searchTerm
      const r = opts?.role ?? filters.roleFilter
      const df = opts?.df ?? filters.dateFrom
      const dt = opts?.dt ?? filters.dateTo

      setLoading(true)

      try {
        const res = await getUsers(1, CLIENT_FETCH_LIMIT, s, r, df, dt)
        if (res.success) {
          const mapped = (res.payload ?? []).map(mapUser)
          setUsers(mapped)
          setTotal(res.total ?? 0)
          setError(null)
        } else {
          setError(res.message ?? 'Failed to load users')
        }
      } catch {
        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    },
    [
      filters.searchTerm,
      filters.roleFilter,
      filters.dateFrom,
      filters.dateTo,
      mapUser,
    ],
  )

  // Fetch on filter changes
  useEffect(() => {
    setPage(1)
    fetchUsers()
  }, [
    filters.searchTerm,
    filters.roleFilter,
    filters.dateFrom,
    filters.dateTo,
    fetchUsers,
  ])

  // Client-side sort + pagination over the fetched set — instant, no refetch
  const sortedUsers = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...users].sort((a, b) => {
      const va = sortValue(a, sortField)
      const vb = sortValue(b, sortField)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [users, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / filters.perPage))
  const pageUsers = sortedUsers.slice(
    (page - 1) * filters.perPage,
    page * filters.perPage,
  )

  // Filters can shrink the set below the current page — clamp back
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function goToPage(p: number) {
    const clamped = Math.min(Math.max(1, p), Math.max(1, totalPages))
    setPage(clamped)
    setPageInput(String(clamped))
  }

  function commitPageInput() {
    const n = parseInt(pageInput, 10)
    if (Number.isNaN(n)) {
      setPageInput(String(page))
      return
    }
    goToPage(n)
  }

  function handleSort(field: string) {
    setSortDir((prev) =>
      sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc',
    )
    setSortField(field)
  }

  function handlePerPageChange(pp: number) {
    setFilters((prev) => ({ ...prev, perPage: pp }))
    setPage(1)
  }

  function refreshAfterMutation() {
    fetchUsers()
  }

  function openAddUserModal() {
    setModal('add')
  }

  function openEditUserModal(user: UserItem) {
    setSelectedUser(user)
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setSelectedUser(null)
  }

  const canManage =
    session?.user?.role === 'SUPERADMIN' || session?.user?.role === 'ADMIN'
  const isSuperadmin = session?.user?.role === 'SUPERADMIN'

  return (
    <div className="flex flex-col w-full h-full">
      <PageLabel label="Users" />

      <div className="w-full flex flex-nowrap items-center justify-between gap-x-[16px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
        {/* Single line: search + filters scroll sideways rather than wrapping. */}
        <ScrollFadeRegion className="flex items-center gap-2.5 flex-1">
          <UsersToolbar filters={filters} onFilterChange={setFilters} />
        </ScrollFadeRegion>
        {canManage && (
          <div className="flex items-center gap-[8px] shrink-0">
            <button
              type="button"
              onClick={openAddUserModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#707dff] via-[#707dff] to-[#5555ff] bg-[length:200%_200%] bg-[position:0%_0%] hover:bg-[position:100%_100%] text-white rounded-xl text-sm font-semibold transition-all duration-500 shadow-sm hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 shrink-0"
            >
              <UserPlus size={16} />
              <span>Add User</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[10px] flex-1 min-h-px px-4 sm:px-[30px] py-[30px]">

        <UsersTable
          users={pageUsers}
          error={loading ? null : error}
          loading={loading}
          isEmpty={
            !loading &&
            users.length === 0 &&
            !filters.searchTerm &&
            !filters.roleFilter
          }
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          getRowActions={(item) => {
            const actions: any[] = [
              { label: 'Edit', onClick: () => openEditUserModal(item) },
            ]

            if (isSuperadmin) {
              if (item.role === 'FACULTY') {
                actions.push({
                  label: item.isProgramChair
                    ? 'Remove as Chair'
                    : 'Set as Chair',
                  onClick: () => setChairConfirmTarget(item),
                })
              }

              actions.push({
                label: 'Delete',
                variant: 'danger' as const,
                onClick: () => setDeleteTarget(item),
              })
            }

            return actions
          }}
        />

        {/* Footer — same pagination bar as the audit log */}
        <div className="shrink-0 flex-none flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12.5px] font-medium text-[#5a6382]">
              <span className="hidden sm:inline">Rows per page</span>
              <span className="sm:hidden">Rows</span>
              <select
                value={filters.perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="h-[32px] px-2.5 pr-7 bg-white border border-[#e8ebf8] rounded-[9px] text-[13px] font-semibold text-[#1e2145] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.18)] focus:border-[#707dff] transition-all"
                aria-label="Rows per page"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="hidden md:inline text-[12px] text-[#8a93b4] border-l border-[#f0f2fa] pl-3">
              {total > users.length
                ? `first ${users.length} of ${total} total — refine filters`
                : `${total} total`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-medium text-[#5a6382] hidden sm:inline">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitPageInput()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                className="w-[64px] h-[32px] px-2 text-center bg-white border border-[#e8ebf8] rounded-[9px] text-[13px] font-semibold text-[#1e2145] focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.18)] focus:border-[#707dff] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Page number"
              />
              <span className="text-[12.5px] font-medium text-[#8a93b4] whitespace-nowrap">/ {totalPages}</span>
            </div>

            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="inline-flex items-center justify-center size-[32px] rounded-[9px] bg-white border border-[#e8ebf8] text-[#5a6382] hover:bg-[#fafbff] hover:border-[#dfe3fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-[14px]" />
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || loading}
                aria-label="Next page"
                className="inline-flex items-center justify-center size-[32px] rounded-[9px] bg-white border border-[#e8ebf8] text-[#5a6382] hover:bg-[#fafbff] hover:border-[#dfe3fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="size-[14px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddUserModal
        isOpen={modal === 'add'}
        onClose={closeModal}
        onSuccess={refreshAfterMutation}
      />

      <EditUserModal
        user={selectedUser}
        onClose={closeModal}
        onSuccess={refreshAfterMutation}
      />

      <DeleteUserModal
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={refreshAfterMutation}
      />

      <ConfirmChairModal
        user={chairConfirmTarget}
        onClose={() => setChairConfirmTarget(null)}
        onSuccess={refreshAfterMutation}
      />
    </div>
  )
}
