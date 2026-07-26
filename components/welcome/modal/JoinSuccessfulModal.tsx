'use client'

import { Check } from 'lucide-react'
import { useWelcomeModal } from '@/store/useWelcomeModal'

export function JoinSuccessfulModal() {
  const setSuccessModal = useWelcomeModal((state) => state.setSuccessModal)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]"
      onClick={() => setSuccessModal(null)}
    >
      <div
        className="w-96 p-7 bg-white rounded-2xl shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06),0px_24px_64px_0px_rgba(16,20,58,0.16)] outline outline-1 outline-offset-[-1px] outline-violet-100 inline-flex flex-col justify-start items-start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="self-stretch pt-3 pb-2 flex flex-col justify-start items-center gap-3.5">
          <div className="size-14 bg-green-500/10 rounded-3xl inline-flex justify-center items-center">
            <Check size={28} className="text-green-500" strokeWidth={3} />
          </div>
          <div className="w-full flex flex-col justify-start items-start">
            <div className="self-stretch flex flex-col justify-start items-center">
              <div className="text-center text-slate-900 text-base font-bold font-['Sora'] leading-6">
                You've joined successfully!
              </div>
            </div>
            <div className="self-stretch pt-2 flex flex-col justify-start items-center">
              <div className="text-center text-slate-400 text-xs font-medium font-['Plus_Jakarta_Sans'] leading-5">
                You now have access to your class section and milestone workspace.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
