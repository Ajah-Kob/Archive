'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { SectionModal } from './SectionModal'
import { RemoveSectionModal } from './RemoveSectionModal'
import { copySectionJoinCode } from '@/lib/actions/sections'
import { useSectionsRefresh } from '@/store/useSectionsRefresh'

interface SectionContextProps {
  section: {
    id: number
    name: string
    hasJoinCode: boolean
    joinCode: string | null
  }
}

export function SectionContext({ section }: SectionContextProps) {
  const router = useRouter()
  const bump = useSectionsRefresh((state) => state.bump)
  const [copied, setCopied] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function handleCopy() {
    if (!section.joinCode || copied) return
    try {
      await navigator.clipboard.writeText(section.joinCode)
    } catch {
      toast.error('Could not copy invite code.')
      return
    }
    setCopied(true)
    toast.success('Invite code copied')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }

  async function handleRegenerate() {
    const res = await copySectionJoinCode(section.id)
    if (!res.success || !res.payload) {
      toast.error(res.message)
      return
    }
    try {
      await navigator.clipboard.writeText(res.payload.code)
    } catch {
      // clipboard unavailable — the code is still regenerated server-side
    }
    toast.success(
      res.payload.regenerated
        ? 'New invite code generated and copied.'
        : 'Invite code copied.',
    )
    router.refresh()
  }

  function handleEditSuccess() {
    setEditOpen(false)
    bump()
    router.refresh()
  }

  function handleRemoveSuccess() {
    setRemoveOpen(false)
    bump()
    router.push('/faculty')
  }

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!section.joinCode || copied}
        className={`flex gap-[7px] items-center h-[30px] px-[11px] rounded-[9px] font-sans font-bold text-[12.5px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          copied
            ? 'bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] text-[#22c55e]'
            : 'bg-white border border-[rgba(112,125,255,0.19)] text-[#707dff] hover:bg-[#f7f7ff]'
        }`}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied' : 'Copy Invite Code'}
      </button>

      <ActionMenu
        items={[
          {
            label: section.hasJoinCode
              ? 'Regenerate Invite Code'
              : 'Generate Invite Code',
            onClick: handleRegenerate,
          },
          {
            label: 'Edit Section',
            onClick: () => setEditOpen(true),
          },
          {
            label: 'Remove Section',
            onClick: () => setRemoveOpen(true),
            variant: 'danger',
          },
        ]}
      />

      {editOpen && (
        <SectionModal
          mode="edit"
          section={section}
          onClose={() => setEditOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {removeOpen && (
        <RemoveSectionModal
          section={section}
          onClose={() => setRemoveOpen(false)}
          onSuccess={handleRemoveSuccess}
        />
      )}
    </>
  )
}