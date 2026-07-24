import { TriangleAlert } from 'lucide-react'

interface InvitationCodeInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string | null
}

export function InvitationCodeInput({
  value,
  onChange,
  placeholder = '',
  error,
}: InvitationCodeInputProps) {
  const hasError = !!error

  return (
    <form className="flex flex-col items-start w-full pt-[22px]">
      <div className="pb-[7px]">
        <label className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12.5px] leading-[18.75px] text-[#3c4268] tracking-[0.125px]">
          Invitation Code
        </label>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-[42.25px] bg-white border rounded-[9px] px-[15px] py-[11px] text-[13.5px] tracking-[0.27px] font-medium outline-none ${
          hasError
            ? 'border-[rgba(254,111,111,0.5)] text-[#12143a]'
            : 'border-[rgba(214,217,241,0.91)] text-[#12143a]'
        }`}
      />
      {hasError && (
        <div className="flex gap-[6px] items-start pt-[8px] w-full">
          <TriangleAlert size={13} className="text-[#fe6f6f] shrink-0 mt-px" />
          <p className="font-medium text-[12px] leading-[17.4px] text-[#fe6f6f]">
            {error}
          </p>
        </div>
      )}
    </form>
  )
}
