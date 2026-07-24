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
    <button className="flex-1 flex items-center justify-center gap-[8px] py-[10px] rounded-[9px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 linear-gradient(169.736deg, #707dff 0%, #5565ff 100%)">
      Join as Student
      <ArrowRight size={14} />
    </button>
  )
}

function JoinAsFacultyButton() {
  return (
    <button className="flex-1 flex items-center justify-center gap-[8px] py-[10px] rounded-[9px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 linear-gradient(169.736deg, #707dff 0%, #5565ff 100%)">
      Join as Faculty
      <ArrowRight size={14} />
    </button>
  )
}
