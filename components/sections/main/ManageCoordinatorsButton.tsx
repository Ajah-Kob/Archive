'use client'

import { UserCog } from 'lucide-react'
import { ManageCoodinatorDrawer } from '@/components/faculty/drawer/ManageCoodinatorDrawer'
import { useCoordinatorDrawer } from '@/store/useCoordinatorDrawer'

/**
 * Toolbar action for the Coordinator Management page: opens the drawer that
 * assigns/removes section coordinators. Rendered together with its drawer —
 * both halves communicate through the useCoordinatorDrawer store.
 */
export function ManageCoordinatorsButton() {
  const open = useCoordinatorDrawer((s) => s.open)

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex gap-[7px] items-center h-[37px] px-[15px] py-[9px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[13px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
      >
        <UserCog className="size-4" />
        Manage Coordinators
      </button>
      <ManageCoodinatorDrawer />
    </>
  )
}
