import Link from 'next/link'
import { EvaluationTeamsView } from '@/components/evaluation/teams/EvaluationTeamsView'
import type { EvaluationItem } from '@/lib/actions/evaluation'

type TabId = 'teams' | 'defense'

interface EvaluationTabsProps {
  items: EvaluationItem[]
  /** Active segment — prop-driven, not client state. Defaults to teams. */
  active?: TabId
}

/**
 * Deprecated: Document Review now directly renders EvaluationTeamsView at
 * /faculty/document-review (no client-state tabs).
 *
 * Kept for backward compatibility — refactored to stateless Link segments
 * without client state. New code should import EvaluationTeamsView
 * directly instead of this wrapper.
 */
export function EvaluationTabs({
  items,
  active = 'teams',
}: EvaluationTabsProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <nav className="flex items-center gap-1 px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
        <Link
          href="/faculty/document-review"
          className={`relative flex items-center h-[40px] px-[14px] font-sans text-[13px] transition-colors ${
            active === 'teams'
              ? 'font-bold text-[#707dff]'
              : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
          }`}
        >
          Teams
          {active === 'teams' && (
            <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />
          )}
        </Link>
        <Link
          href="/faculty/document-review/defense"
          className={`relative flex items-center h-[40px] px-[14px] font-sans text-[13px] transition-colors ${
            active === 'defense'
              ? 'font-bold text-[#707dff]'
              : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
          }`}
        >
          Defense
          {active === 'defense' && (
            <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />
          )}
        </Link>
      </nav>

      <div className="flex-1 min-h-0 pt-[16px] px-8 flex flex-col">
        {active === 'teams' ? (
          <EvaluationTeamsView items={items} />
        ) : (
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col items-center justify-center px-10 py-16">
            <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
              Defense Evaluations
            </h3>
            <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
              Defense evaluations from panelists will appear here once the
              panelist workflow is available.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
