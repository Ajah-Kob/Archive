'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { getFacultyInvitationCode } from '@/lib/actions/invitation-code'

export function CopyInviteCode() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    setCopied(true)
    const res = await getFacultyInvitationCode()
    const code = res.payload.code
    await navigator.clipboard.writeText(code)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex gap-[7px] items-center h-[37.5px] px-[15px] rounded-[9px] border transition-colors ${
        copied
          ? 'bg-[#ecfaf5] border-[rgba(16,185,129,0.28)]'
          : 'bg-[#f7f7ff] border-[rgba(112,125,255,0.19)]'
      }`}
    >
      {copied ? (
        <Check className="size-[13px] text-[#059669]" />
      ) : (
        <Copy className="size-[13px] text-[#707dff]" />
      )}
      <span
        className={`font-sans font-bold text-[13px] leading-[19.5px] ${
          copied ? 'text-[#059669]' : 'text-[#707dff]'
        }`}
      >
        {copied ? 'Copied!' : 'Copy Invite Code'}
      </span>
    </button>
  )
}
