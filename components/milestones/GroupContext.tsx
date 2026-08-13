'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { RenameGroupModal } from '@/components/milestones/RenameGroupModal'
import { ConfirmDialog } from '@/components/milestones/ConfirmDialog'
import { leaveGroup } from '@/lib/actions/groups'
import { JOURNEY_ROWS } from '@/types/milestones'

interface GroupContextProps {
  group: {
    id: number
    name: string
    isLeader: boolean
    topicTitle?: string | null
  }
}

interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  action: () => Promise<{ success: boolean; message: string }>
}

export function GroupContext({ group }: GroupContextProps) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [renameOpen, setRenameOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busy, setBusy] = useState(false)

  const activeRow = JOURNEY_ROWS.find(
    (row) => pathname.endsWith(`/${row.slug}`) || pathname.includes(`/${row.slug}/`),
  )
  const pageName = activeRow ? activeRow.label : 'Milestones'

  const makeLeave = (): ConfirmState => ({
    title: 'Leave Group?',
    message: `You'll leave ${group.name} and lose access to its workspace.`,
    confirmLabel: 'Leave',
    action: () => leaveGroup(),
  })

  const runConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    const res = await confirm.action()
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setConfirm(null)
      router.push('/milestone')
    } else {
      toast.error(res.message)
      setConfirm(null)
    }
  }

  const items = [
    ...(group.isLeader
      ? [
          {
            label: 'Rename Group',
            onClick: () => setRenameOpen(true),
          },
        ]
      : []),
    {
      label: 'Leave Group',
      icon: <LogOut className="size-[13px]" />,
      variant: 'danger' as const,
      onClick: () => setConfirm(makeLeave()),
    },
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[10px] py-[14px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0">
      <div className="flex flex-col min-w-0">
        <h1 className="font-['Sora',sans-serif] font-bold text-[22px] leading-[33px] text-[#12143a] tracking-[-0.22px] truncate">
          {group.name}
        </h1>
        <p className="truncate font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
          {pageName}
        </p>
      </div>

      <div className="flex items-center gap-[8px] shrink-0">
        <ActionMenu items={items} />
      </div>

      {renameOpen && (
        <RenameGroupModal
          groupId={group.id}
          currentName={group.name}
          onClose={() => setRenameOpen(false)}
          onRenamed={() => {
            setRenameOpen(false)
            router.refresh()
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          busy={busy}
          onConfirm={runConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}