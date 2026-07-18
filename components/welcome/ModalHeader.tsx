import { X } from 'lucide-react'

interface ModalHeaderProps {
  title: string
  description: string
  onClose: () => void
}

export function ModalHeader({ title, description, onClose }: ModalHeaderProps) {
  return (
    <>
      <div className="flex flex-col items-start w-full">
        <p className="font-['Sora',sans-serif] font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
          {title}
        </p>
        <p className="font-medium text-[13px] leading-[20.15px] text-[#8a93b4] pt-[7px] w-full">
          {description}
        </p>
      </div>

      <button
        onClick={onClose}
        className="absolute top-[18px] right-[18px] size-[28px] bg-[#fafbff] border border-[#eceef8] rounded-[14px] flex items-center justify-center cursor-pointer"
      >
        <X size={13} className="text-[#8a93b4]" />
      </button>
    </>
  )
}
