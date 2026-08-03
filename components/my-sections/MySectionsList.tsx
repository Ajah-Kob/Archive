'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NoSectionIcon } from '@/assets/NoSectionIcon'
import { MySectionsCard } from './MySectionsCard'
import { SectionModal } from './SectionModal'
import { RemoveSectionModal } from './RemoveSectionModal'
import type { MySectionCardData } from '@/lib/actions/sections'

interface MySectionsListProps {
  sections: MySectionCardData[]
}

export function MySectionsList({ sections }: MySectionsListProps) {
  const router = useRouter()
  const [editTarget, setEditTarget] = useState<MySectionCardData | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MySectionCardData | null>(null)

  if (sections.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col items-center justify-center px-10 py-16 w-full">
        <div className="mb-5">
          <NoSectionIcon />
        </div>
        <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] text-center mb-2">
          No Sections Created
        </h3>
        <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
          Create your first capstone section to start enrolling students.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {sections.map((section) => (
        <MySectionsCard
          key={section.id}
          section={section}
          onEdit={setEditTarget}
          onRemove={setRemoveTarget}
        />
      ))}

      {editTarget && (
        <SectionModal
          mode="edit"
          section={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null)
            router.refresh()
          }}
        />
      )}

      {removeTarget && (
        <RemoveSectionModal
          section={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onSuccess={() => {
            setRemoveTarget(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
