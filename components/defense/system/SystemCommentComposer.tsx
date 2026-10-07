'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { addSystemComment } from '@/lib/actions/system-links'

// Panelist-only affordance: students read comments but never write one.
export function SystemCommentComposer({
  linkId,
  placeholder,
  autoFocus = false,
  onDone,
  compact = false,
}: {
  linkId: number
  placeholder: string
  autoFocus?: boolean
  onDone?: (comment?: unknown) => void
  compact?: boolean
}) {
  const router = useRouter()

  type ActionState = { success: boolean; message: string; payload: unknown }

  async function submit(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
    const res = await addSystemComment(linkId, formData)
    if (res.success) {
      toast.success(res.message)
      onDone?.(res.payload)
      router.refresh()
      return { success: true, message: res.message, payload: res.payload }
    }
    toast.error(res.message)
    return { success: false, message: res.message, payload: null }
  }

  const [state, formAction, isPending] = useActionState(submit, null)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="body"
        rows={compact ? 2 : 3}
        autoFocus={autoFocus}
        placeholder={placeholder}
        maxLength={2000}
        className="w-full resize-y rounded-[10px] border border-[#dfe3fb] bg-white px-3 py-2 font-sans text-[13px] text-[#2c3159] outline-none focus:border-[#707dff] focus:ring-2 focus:ring-[#707dff]/15"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 h-[30px] px-3 rounded-[9px] bg-[#707dff] font-sans text-[12.5px] font-bold text-white transition-colors hover:bg-[#5062f5] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Send className="size-3.5" />
          {isPending ? 'Posting…' : 'Post'}
        </button>
        <button
          type="button"
          onClick={() => onDone?.()}
          className="h-[30px] px-3 rounded-[9px] font-sans text-[12.5px] font-semibold text-[#8a93b4] hover:text-[#5a6382] transition-colors"
        >
          Cancel
        </button>
        {state && !state.success ? (
          <span className="font-sans text-[12px] text-[#d34d5c]">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  )
}
