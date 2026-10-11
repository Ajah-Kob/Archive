import { PageLabel } from '@/components/globals/PageLabel'
import { HeaderBar } from '@/components/globals/HeaderBar'
import UsersTableSkeleton from '@/components/features/users/main/UsersTableSkeleton'

/**
 * Streaming fallback for /admin/users.
 *
 * Mirrors DashboardUsersPage chrome: the HeaderBar strip (search + role
 * filter + date-range pair, Add User slot) over UsersTableSkeleton and the
 * shared pagination footer bar. Empty fixed-width blocks only, no text.
 */
export default function AdminUsersLoading() {
  return (
    <div className="flex flex-col w-full h-full">
      <PageLabel label="Users" />

      <HeaderBar
        actions={
          <div
            aria-hidden="true"
            className="h-[38px] w-[110px] rounded-xl bg-[#c9cffb] animate-pulse motion-reduce:animate-none"
          />
        }
      >
        <div
          aria-hidden="true"
          className="flex flex-nowrap items-center gap-2.5 w-max animate-pulse motion-reduce:animate-none"
        >
          <div className="h-[37.5px] w-[240px] sm:w-[320px] shrink-0 rounded-lg bg-[#dfe3fb]" />
          <div className="h-[37.5px] w-[140px] shrink-0 rounded-lg bg-[#dfe3fb]" />
          <div className="w-[280px] sm:w-[320px] shrink-0 grid grid-cols-2 gap-[12px]">
            <div className="h-[40px] rounded-md bg-white border border-[#e4e7f6]" />
            <div className="h-[40px] rounded-md bg-white border border-[#e4e7f6]" />
          </div>
        </div>
      </HeaderBar>

      <div
        aria-hidden="true"
        className="flex flex-col gap-[10px] flex-1 min-h-px px-4 sm:px-[30px] py-[30px] animate-pulse motion-reduce:animate-none"
      >
        <UsersTableSkeleton />

        {/* Footer — same pagination bar shell as the users page */}
        <div className="shrink-0 flex-none flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="h-[32px] w-[140px] rounded-[9px] bg-[#e8ebf8]" />
            <div className="hidden md:block h-[12px] w-[70px] rounded bg-[#e8ebf8]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-[32px] w-[64px] rounded-[9px] bg-white border border-[#e8ebf8]" />
            <div className="size-[32px] rounded-[9px] bg-white border border-[#e8ebf8]" />
            <div className="size-[32px] rounded-[9px] bg-white border border-[#e8ebf8]" />
          </div>
        </div>
      </div>
    </div>
  )
}
