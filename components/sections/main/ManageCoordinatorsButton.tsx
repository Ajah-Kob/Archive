'use client'

import { UserPlus } from 'lucide-react'
import { ManageCoodinatorDrawer } from '@/components/faculty/drawer/ManageCoodinatorDrawer'
import { useCoordinatorDrawer } from '@/store/useCoordinatorDrawer'

/**
 * Toolbar action for the Coordinator Management page: opens the drawer that
 * assigns/removes section coordinators. Rendered together with its drawer —
 * both halves communicate through the useCoordinatorDrawer store.
 */
export function ManageCoordinatorsButton({ primary = false }: { primary?: boolean }) {
  const open = useCoordinatorDrawer((s) => s.open)

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          primary
            ? 'inline-flex items-center justify-center gap-1.5 h-[37.5px] px-[14px] bg-[#707dff] text-white rounded-lg font-sans font-semibold text-[13px] shadow-[0px_2px_5px_rgba(112,125,255,0.25)] hover:bg-[#5565ff] active:scale-[0.98] transition-all shrink-0'
            : 'flex gap-[7px] items-center h-[37px] px-[15px] py-[9px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[13px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0'
        }
      >
        <UserPlus className="size-4" />
        Add Coordinator
      </button>
      <ManageCoodinatorDrawer />
    </>
  )
}
