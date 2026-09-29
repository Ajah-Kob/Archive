import { Layers } from 'lucide-react'
import type { SectionOverview } from '@/lib/actions/chair-dashboard'
import { ChairCard, ChairStat } from '@/components/chair/ChairCard'

const SECTION_MGMT = '/faculty/section-management'

/**
 * Section Overview — total, staffed, and unstaffed.
 *
 * The unstaffed column is the actionable one: a section with no coordinator is a
 * problem, so it renders red. The Figma mock showed a green check there, which
 * read as healthy and was wrong.
 */
export function ChairSectionOverviewCard({
  data,
  message,
}: {
  data: SectionOverview | null
  message?: string
}) {
  return (
    <ChairCard icon={Layers} title="Section Overview" href={SECTION_MGMT}>
      {!data ? (
        <p className="px-[20px] pb-[18px] font-sans font-medium text-[11.5px] leading-[17px] text-[#9ea8c6]">
          {message ?? 'Section data unavailable.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-[10px] px-[20px] pb-[18px]">
          <ChairStat value={data.total} label="Total Sections" href={SECTION_MGMT} />
          <ChairStat
            value={data.assigned}
            label="Assigned Coordinators"
            href={`${SECTION_MGMT}?coordinator=assigned`}
          />
          <ChairStat
            value={data.unassigned}
            label="Unassigned"
            tone={data.unassigned > 0 ? 'alert' : 'default'}
            href={`${SECTION_MGMT}?coordinator=unassigned`}
          />
        </div>
      )}
    </ChairCard>
  )
}
