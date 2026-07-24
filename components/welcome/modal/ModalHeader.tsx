import { X } from 'lucide-react'
import { useWelcomeModal } from '@/store/useWelcomeModal'
interface ModalHeader {
  type: 'student' | 'faculty'
}

const headerText = {
  stundent: {
    title: 'Join as Student',
    description: 'Join as Student',
  },
  faculty: {
    title: 'Join Faculty',
    description: 'Enter the invitation code provided by the Program Chair.',
  },
}

export function ModalHeader({ type }: ModalHeader) {
  const headerType = headerText[type]
  const setActiveModal = useWelcomeModal((state) => state.setActiveModal)

  return (
    <>
      <div className="flex flex-col items-start w-full">
        <p className="font-['Sora',sans-serif] font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
          {headerType.title}
        </p>
        <p className="font-medium text-[13px] leading-[20.15px] text-[#8a93b4] pt-[7px] w-full">
          {headerType.description}
        </p>
      </div>

      <button
        onClick={() => setActiveModal(null)}
        className="absolute top-[18px] right-[18px] size-[28px] bg-[#fafbff] border border-[#eceef8] rounded-[14px] flex items-center justify-center cursor-pointer"
      >
        <X size={13} className="text-[#8a93b4]" />
      </button>
    </>
  )
}
