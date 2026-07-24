import { ArrowRight } from 'lucide-react'
import { useWelcomeModal } from '@/store/useWelcomeModal'

interface ModalFooter {
  type: 'student' | 'faculty'
}

export function ModalFooter({ type }: ModalFooter) {
  const setActiveModal = useWelcomeModal((state) => state.setActiveModal)

  return (
    <div className="flex gap-[10px] items-start pt-[20px] w-full">
      <button
        className="flex-1 bg-white border border-[#dddff0] rounded-[9px] py-[11px] text-center font-semibold text-[13.5px] text-[#5a6382] cursor-pointer"
        onClick={() => setActiveModal(null)}
      >
        Cancel
      </button>
      {type === 'student' && <JoinAsStudentButton />}
      {type === 'faculty' && <JoinAsFacultyButton />}
    </div>
  )
}

function JoinAsStudentButton() {
  return (
    <button className="flex-1 flex items-center justify-center gap-[8px] py-[10px] rounded-[9px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 bg-gradient-to-br from-red-400 to-red-500 shadow-[0px_4px_14px_0px_rgba(112,125,255,0.30)]">
      Join as Student
      <ArrowRight size={14} />
    </button>
  )
}

function JoinAsFacultyButton() {
  return (
    <button className="flex-1 flex items-center justify-center gap-[8px] py-[10px] rounded-[9px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-[0px_4px_14px_0px_rgba(112,125,255,0.30)]">
      Join as Faculty
      <ArrowRight size={14} />
    </button>
  )
}
