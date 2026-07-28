'use client'

import { useCoordinatorDrawer } from '@/store/useCoordinatorDrawer'
import { NoSectionIcon } from '@/assets/NoSectionIcon'
import { TableListHeader } from './TableListHeader'
import { SectionDataRow, type SectionData } from './SectionDataRow'

interface SectionTableProps {
  sections: SectionData[]
}

export function SectionTable({ sections }: SectionTableProps) {
  const openDrawer = useCoordinatorDrawer((s) => s.open)
  if (sections.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
        <TableListHeader title="Sections" onAction={openDrawer} />
        <div className="flex flex-col items-center justify-center px-10 py-16 w-full">
          <div className="mb-5">
            <NoSectionIcon />
          </div>
          <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] text-center mb-2">
            No Sections Created
          </h3>
          <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
            No sections have been created by coordinators yet. Sections will
            appear here once coordinators start setting up their classes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Table Header */}
      <TableListHeader title="Sections" onAction={openDrawer} />

      {/* Header Row */}
      <div className="w-full">
        <div className="flex bg-[#fafbff] border-b border-[#f0f2fa]">
          <div className="w-[300px] shrink-0 px-7 py-[9px]">
            <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#8a93b4] tracking-[0.735px] uppercase">
              Coordinator
            </span>
          </div>
          <div className="w-[150px] shrink-0 py-[9px]">
            <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#8a93b4] tracking-[0.735px] uppercase">
              Section
            </span>
          </div>
          <div className="w-[170px] shrink-0 py-[9px]">
            <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#8a93b4] tracking-[0.735px] uppercase">
              Date Created
            </span>
          </div>
          <div className="w-[150px] shrink-0 py-[9px]">
            <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#8a93b4] tracking-[0.735px] uppercase">
              Students
            </span>
          </div>
          <div className="w-[187px] shrink-0 py-[9px]">
            <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#8a93b4] tracking-[0.735px] uppercase">
              Groups
            </span>
          </div>
          <div className="w-[78px] shrink-0" />
        </div>

        {/*Section Rows */}
        {sections.map((item) => (
          <SectionDataRow key={item.id} data={item} />
        ))}
      </div>
    </div>
  )
}
