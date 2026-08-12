'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { RenameGroupModal } from '@/components/milestones/RenameGroupModal'

interface GroupContextProps {
  group: {
    id: number
    name: string
    isLeader: boolean
    topicTitle?: string | null
  }
}

export function GroupContext({ group }: GroupContextProps) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[10px] py-[14px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0">
      <div className="flex flex-col min-w-0">
        <h1 className="font-['Sora',sans-serif] font-bold text-[22px] leading-[33px] text-[#12143a] tracking-[-0.22px] truncate">
          {group.name}
        </h1>
        <p className="truncate font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
          {group.topicTitle ?? 'Topic not selected yet.'}
        </p>
      </div>

      <div className="flex items-center gap-[8px] shrink-0">
        {group.isLeader && (
          <ActionMenu
            items={[
              {
                label: 'Rename Group',
                onClick: () => setRenameOpen(true),
              },
            ]}
          />
        )}
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
    </div>
  )
}