import { UserCog, X } from 'lucide-react'
import { useCoordinatorDrawer } from '@/store/useCoordinatorDrawer'

export function DrawerHeader() {
  const close = useCoordinatorDrawer((state) => state.close)

  return (
    <div className="flex self-stretch items-center border-b px-6 py-4 border-slate-100 ">
      <div className="flex flex-1 items-center gap-2.5">
        {/* User Cog Icon */}
        <div className="size-10 bg-indigo-400/5 rounded-lg flex justify-center items-center text-[#707DFF]">
          <UserCog className="size-4" />
        </div>

        {/* Heading  */}
        <div className="self-stretch flex items-center text-blue-900 text-base font-bold font-['Sora'] leading-6">
          <span className="text-blue-900 text-center text-base font-bold font-['Sora'] leading-6">
            Manage Coordinators
          </span>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={close}
        className="flex justify-center items-center size-7 bg-violet-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-violet-100 "
      >
        <X className="size-4 text-slate-400" />
      </button>
    </div>
  )
}
