'use client'

import { useState } from 'react'
import { GraduationCap, Users } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { useWelcomeModal } from '@/store/useWelcomeModal'

export function JoinAsStudentWelcomeCard() {
  const setActiveModal = useWelcomeModal((state) => state.setActiveModal)
  return (
    <div className="flex flex-col gap-[20px] bg-white rounded-[14px] shadow-[0px_2px_12px_rgba(112,125,255,0.06),0px_1px_3px_rgba(0,0,0,0.04)] p-[30px] w-[270px] h-fit">
      <div className="flex items-center justify-center size-[48px] rounded-[13px] bg-[#fe6f6f21]">
        <GraduationCap size={24} className="text-[#fe6f6f]" />
      </div>

      <div className="flex flex-col gap-[10px]">
        <h2 className="font-['Sora',sans-serif] text-[18px] text-[#12143a]">
          Join as Student
        </h2>
        <p className="text-[14px] text-[#8a93b4]">
          Join your class section using the invitation code provided by your
          Coordinator.
        </p>
      </div>

      <button
        onClick={() => setActiveModal('student')}
        className="flex items-center justify-center gap-[7px] w-full py-[10px] rounded-[10px] text-[13.5px] font-semibold text-white cursor-pointer bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-[0px_4px_14px_0px_rgba(112,125,255,0.30)]"
      >
        Join as Student
        <ArrowRight size={15} />
      </button>
    </div>
  )
}

export function JoinAsFacultyWelcomeCard() {
  const setActiveModal = useWelcomeModal((state) => state.setActiveModal)
  return (
    <div className="flex flex-col gap-[20px] bg-white rounded-[14px] shadow-[0px_2px_12px_rgba(112,125,255,0.06),0px_1px_3px_rgba(0,0,0,0.04)] p-[30px] w-[270px] h-fit">
      <div className="flex items-center justify-center size-[48px] rounded-[13px] bg-[#707cff17]">
        <Users size={24} className="text-[#707dff]" />
      </div>

      <div className="flex flex-col gap-[10px]">
        <h2 className="font-['Sora',sans-serif] text-[18px] text-[#12143a]">
          Join as Faculty
        </h2>
        <p className="text-[14px] text-[#8a93b4]">
          Join the faculty using the invitation code provided by the Program
          Chair.
        </p>
      </div>

      <button
        onClick={() => setActiveModal('faculty')}
        className="flex items-center justify-center gap-[7px] w-full py-[10px] rounded-[10px] text-[13.5px] font-semibold text-white cursor-pointer bg-gradient-to-br from-red-400 to-red-500 shadow-[0px_4px_14px_0px_rgba(112,125,255,0.30)]"
      >
        Join as Faculty
        <ArrowRight size={15} />
      </button>
    </div>
  )
}

