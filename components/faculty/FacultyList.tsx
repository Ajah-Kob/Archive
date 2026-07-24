'use client'

import { Search, ChevronDown } from 'lucide-react'
import { FacultyTable, type FacultyMember } from './FacultyTable'
import { CopyInviteCode } from './CopyInviteCode'

const facultyData: FacultyMember[] = [
  {
    id: 1,
    initials: 'MS',
    name: 'Dr. Maria Santos',
    email: 'm.santos@university.edu',
    avatarGradient: 'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
    activityStatus: 'active',
    workload: { current: 2, max: 8 },
  },
  {
    id: 2,
    initials: 'AS',
    name: 'Prof. Andrea Santos',
    email: 'a.santos@university.edu',
    avatarGradient: 'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
    activityStatus: 'active',
    workload: { current: 4, max: 8 },
  },
  {
    id: 3,
    initials: 'CR',
    name: 'Dr. Carlo Reyes',
    email: 'c.reyes@university.edu',
    avatarGradient: 'linear-gradient(135deg, #fe6f6f 0%, #f87c7c 55%, #ff9e9e 100%)',
    activityStatus: '2 hours ago',
    workload: { current: 8, max: 8 },
  },
  {
    id: 4,
    initials: 'MT',
    name: 'Prof. Manuel Tan',
    email: 'm.tan@university.edu',
    avatarGradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%)',
    activityStatus: 'active',
    workload: { current: 5, max: 8 },
  },
  {
    id: 5,
    initials: 'JL',
    name: 'Dr. Julia Lim',
    email: 'j.lim@university.edu',
    avatarGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
    activityStatus: '1 hour ago',
    workload: { current: 0, max: 8 },
  },
]

export function FacultyList() {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 pb-[15px] pt-[14px] px-5 border-b border-[#f0f2fa]">
        <div className="relative flex-[0_0_320px] max-w-[320px] min-w-[180px]">
          <Search className="absolute left-[12.5px] top-1/2 -translate-y-1/2 size-[10px] text-[#8a93b4]" />
          <input
            type="text"
            placeholder="Search faculty…"
            className="w-full h-[37.5px] pl-[33px] pr-[13px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-medium text-[13px] text-[rgba(16,19,58,0.5)] placeholder:text-[rgba(16,19,58,0.5)] outline-none"
          />
        </div>
        <button className="flex gap-[7px] items-center h-[37.5px] px-[14px] py-[9px] bg-[#f4f5fc] border border-[#dddff0] rounded-[9px] font-sans font-semibold text-[13px] text-[#5a6382]">
          All Faculty
          <ChevronDown className="size-[13px]" />
        </button>
        <div className="flex-1 flex justify-end">
          <CopyInviteCode />
        </div>
      </div>
      <FacultyTable faculty={facultyData} />
    </div>
  )
}
