import { UserProfile } from '@/components/ui/UserProfile'
import { ActionMenu } from '@/components/ui/ActionMenu'

interface AssignedCoordinator {
  initials: string
  name: string
  email: string
  gradient: string
  sections: number
}

interface AssignedCoordinatorListProps {
  data: AssignedCoordinator[]
}

export function AssignedCoordinatorList({
  data = [],
}: AssignedCoordinatorListProps) {
  return (
    <div className="flex flex-col gap-2 py-5 items-start w-full">
      <div className="flex items-center gap-2 pb-1">
        <span className="text-blue-900 text-xs font-bold font-['Sora'] leading-5">
          Assigned Coordinators
        </span>
        <div className="flex px-3 py-0.5 items-center bg-slate-100 rounded-[20px] outline outline-1 outline-offset-[-1px] outline-violet-100">
          <span className="text-slate-500 text-xs font-bold font-['Plus_Jakarta_Sans'] leading-4">
            {data.length}
          </span>
        </div>
      </div>

      {data.map((coordinator) => (
        <div
          key={coordinator.email}
          className="w-full bg-[#fafbff] border border-[#e8ebf8] rounded-xl"
        >
          <div className="flex items-center gap-3 p-3">
            <UserProfile
              initials={coordinator.initials}
              name={coordinator.name}
              email={coordinator.email}
              gradient={coordinator.gradient}
            />

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex align-center justify-center px-[10px] py-[4px] bg-[#f0f2fa] border border-[#e8ebf8] rounded-[20px]">
                <span className="font-['Plus_Jakarta_Sans'] font-bold text-[11px] leading-[16.5px] text-[#6b7399] whitespace-nowrap">
                  {coordinator.sections}{' '}
                  {coordinator.sections === 1 ? 'Section' : 'Sections'}
                </span>
              </div>
              <ActionMenu items={[]} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
