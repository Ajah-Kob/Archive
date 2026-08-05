'use client'

interface AuthSubmitButtonProps {
  pending?: boolean
  label: string
  pendingLabel?: string
  disabled?: boolean
  className?: string
}

export function AuthSubmitButton({
  pending = false,
  label,
  pendingLabel = 'Please wait...',
  disabled = false,
  className,
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`self-stretch h-[38px] px-3.5 bg-gradient-to-r from-indigo-400 via-violet-400 via-[57%] to-red-400 to-[140%] rounded-xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08),0px_4px_22px_0px_rgba(112,125,255,0.27)] inline-flex justify-center items-center disabled:animate-pulse disabled:opacity-50 transition-all hover:opacity-95${
        className ? ` ${className}` : ''
      }`}
    >
      <span className="text-center justify-start text-white text-sm font-semibold leading-5 tracking-tight">
        {pending ? pendingLabel : label}
      </span>
    </button>
  )
}
