'use client'

import { ArrowRight, LoaderCircle } from 'lucide-react'

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
      className={`self-stretch h-[38px] px-3.5 bg-gradient-to-r from-[#707dff] from-[0%] via-[#a178cd] via-[35%] to-[#fe6f6f] to-[150%] rounded-[7px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08),0px_4px_22px_0px_rgba(112,125,255,0.27)] inline-flex justify-center items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:opacity-95${
        className ? ` ${className}` : ''
      }`}
    >
      <span className="text-center justify-start text-white text-sm font-semibold leading-5 tracking-tight">
        {pending ? pendingLabel : label}
      </span>
      {pending ? (
        <LoaderCircle className="size-4 text-white animate-spin" />
      ) : (
        <ArrowRight className="size-3.5 text-white" />
      )}
    </button>
  )
}
