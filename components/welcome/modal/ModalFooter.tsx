import { ArrowRight, Loader2 } from 'lucide-react'
import { useWelcomeModal } from '@/store/useWelcomeModal'

interface ModalFooter {
  type: 'student' | 'faculty'
  disabled?: boolean
  isPending?: boolean
}

export function ModalFooter({ type, disabled, isPending }: ModalFooter) {
  const setActiveModal = useWelcomeModal((state) => state.setActiveModal)

  return (
    <div className="flex gap-[10px] items-start pt-[20px] w-full">
      <button
        className="flex-1 bg-white border border-[#dddff0] rounded-[9px] py-[11px] text-center font-semibold text-[13.5px] text-[#5a6382] cursor-pointer"
        onClick={() => setActiveModal(null)}
      >
        Cancel
      </button>
      {type === 'student' && <JoinAsStudentButton disabled={disabled} isPending={isPending} />}
      {type === 'faculty' && <JoinAsFacultyButton disabled={disabled} isPending={isPending} />}
    </div>
  )
}

function JoinAsStudentButton({ disabled, isPending }: { disabled?: boolean; isPending?: boolean }) {
  return (
    <button
      type="submit"
      form="join-section-form"
      disabled={disabled}
      className="flex-1 flex items-center justify-center gap-[8px] py-[11px] rounded-[9px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-red-400 to-red-500 shadow-[0px_4px_14px_0px_rgba(112,125,255,0.30)]"
    >
      {isPending ? 'Joining...' : 'Join as Student'}
      {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
    </button>
  )
}

function JoinAsFacultyButton({ disabled, isPending }: { disabled?: boolean; isPending?: boolean }) {
  return (
    <button
      type="submit"
      form="join-faculty-form"
      disabled={disabled}
      className="flex-1 flex items-center justify-center gap-[8px] py-[11px] rounded-[9px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-[0px_4px_14px_0px_rgba(112,125,255,0.30)]"
    >
      {isPending ? 'Joining...' : 'Join as Faculty'}
      {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
    </button>
  )
}
