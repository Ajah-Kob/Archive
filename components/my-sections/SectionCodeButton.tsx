'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { copySectionJoinCode } from '@/lib/actions/sections'

function maskCode(code: string) {
  return code.length <= 3 ? code + '•••••' : `${code.slice(0, 3)}•••`
}

interface SectionCodeButtonProps {
  sectionId: number
  initialCode?: string | null
}

export function SectionCodeButton({
  sectionId,
  initialCode = null,
}: SectionCodeButtonProps) {
  const [code, setCode] = useState<string | null>(initialCode)
  const [copied, setCopied] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function handleClick() {
    if (isPending) return
    setIsPending(true)
    const res = await copySectionJoinCode(sectionId)
    setIsPending(false)

    if (!res.success || !res.payload) {
      toast.error(res.message)
      return
    }

    const fullCode = res.payload.code
    setCode(fullCode)
    setCopied(true)
    try {
      await navigator.clipboard.writeText(fullCode)
    } catch {
      // clipboard unavailable — the code is still shown in the UI
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }

  const label = !code ? 'Generate' : copied ? 'Copied' : 'Copy'

  return (
    <div className="flex gap-[6px] items-center">
      <span className="font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
        Code:
      </span>
      {code ? (
        <span className="font-['Sora',sans-serif] font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[0.625px]">
          {maskCode(code)}
        </span>
      ) : (
        <span className="font-sans font-medium italic text-[12px] leading-[18px] text-[#c4cadf]">
          No code yet
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`flex gap-[4px] items-center px-[10px] py-[3px] rounded-[6px] border font-sans font-bold text-[10.5px] leading-[15.75px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          copied
            ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.19)] text-[#22c55e]'
            : 'bg-[#f7f7ff] border-[rgba(112,125,255,0.19)] text-[#707dff] hover:bg-[#eeefff]'
        }`}
      >
        {isPending ? (
          <Loader2 size={10} className="animate-spin" />
        ) : copied ? (
          <Check size={10} />
        ) : code ? (
          <Copy size={10} />
        ) : (
          <Plus size={10} />
        )}
        {label}
      </button>
    </div>
  )
}
