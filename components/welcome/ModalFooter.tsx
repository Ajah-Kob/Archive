import { ArrowRight } from 'lucide-react'

interface ModalFooterProps {
  cancelLabel?: string
  submitLabel: string
  submitGradient: string
  onCancel: () => void
  onSubmit: () => void
  disabled?: boolean
}

export function ModalFooter({
  cancelLabel = 'Cancel',
  submitLabel,
  submitGradient,
  onCancel,
  onSubmit,
  disabled,
}: ModalFooterProps) {
  return (
    <div className="flex gap-[10px] items-start pt-[20px] w-full">
      <button
        onClick={onCancel}
        className="flex-1 bg-white border border-[#dddff0] rounded-[9px] py-[11px] text-center font-semibold text-[13.5px] text-[#5a6382] cursor-pointer"
      >
        {cancelLabel}
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="flex-1 flex items-center justify-center gap-[8px] py-[10px] rounded-[9px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50"
        style={{ backgroundImage: submitGradient }}
      >
        {submitLabel}
        <ArrowRight size={14} />
      </button>
    </div>
  )
}
