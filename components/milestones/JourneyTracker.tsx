'use client'

import { useState } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import type { JourneyRow } from '@/types/milestones'

const STATUS_LABEL: Record<JourneyRow['state'], string> = {
  APPROVED: 'Approved',
  NEEDS_REVISION: 'Needs revision',
  SUBMITTED: 'Awaiting review',
  DEFAULT: 'In progress',
  LOCKED: 'Locked',
}

const SIZES = {
  sm: { circle: 16, connector: 10, check: 8, dot: 5, smallDot: 4, badge: 12 },
  md: { circle: 20, connector: 14, check: 10, dot: 6, smallDot: 5, badge: 14 },
}

interface JourneyTrackerProps {
  journey: JourneyRow[]
  size?: 'sm' | 'md'
}

interface Tip {
  x: number
  y: number
  row: JourneyRow
}

export function JourneyTracker({ journey, size = 'md' }: JourneyTrackerProps) {
  const [tip, setTip] = useState<Tip | null>(null)
  const s = SIZES[size]

  const activeIndex = journey.findIndex(
    (row) => row.state !== 'APPROVED' && row.state !== 'LOCKED',
  )

  return (
    <div className="flex items-center justify-start">
      {journey.map((row, i) => {
        const isCurrent = i === activeIndex
        const isRevision = row.state === 'NEEDS_REVISION'
        const showActiveBadge = isCurrent && isRevision
        const connectorColor =
          i < journey.length - 1
            ? row.state === 'APPROVED'
              ? 'rgba(34,197,94,0.25)'
              : isCurrent
                ? 'rgba(112,125,255,0.25)'
                : '#dde0f0'
            : null

        return (
          <div key={row.slug} className="flex items-center">
            <div
              className="relative flex items-center justify-center rounded-full cursor-pointer shrink-0"
              style={{ width: s.circle, height: s.circle }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setTip({ x: rect.left + rect.width / 2, y: rect.top, row })
              }}
              onMouseLeave={() => setTip(null)}
            >
              {row.state === 'APPROVED' ? (
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: s.circle,
                    height: s.circle,
                    backgroundColor: 'rgba(34,197,94,0.09)',
                    border: '1px solid rgba(34,197,94,0.31)',
                  }}
                >
                  <Check
                    className="text-[#22c55e]"
                    strokeWidth={3}
                    style={{ width: s.check, height: s.check }}
                  />
                </div>
              ) : showActiveBadge ? (
                <>
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: s.circle,
                      height: s.circle,
                      backgroundColor: 'rgba(112,125,255,0.09)',
                      border: '1px solid rgba(112,125,255,0.31)',
                    }}
                  >
                    <span
                      className="rounded-full bg-[#707dff]"
                      style={{ width: s.dot, height: s.dot }}
                    />
                  </div>
                  <div
                    className="absolute flex items-center justify-center rounded-full bg-[#f59e0b] border border-white"
                    style={{
                      width: s.badge,
                      height: s.badge,
                      top: -s.badge / 3.2,
                      right: -s.badge / 3.2,
                    }}
                  >
                    <TriangleAlert
                      className="text-white"
                      strokeWidth={3}
                      style={{ width: s.badge * 0.6, height: s.badge * 0.6 }}
                    />
                  </div>
                </>
              ) : isRevision ? (
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: s.circle,
                    height: s.circle,
                    backgroundColor: 'rgba(245,158,11,0.09)',
                    border: '1px solid rgba(245,158,11,0.31)',
                  }}
                >
                  <TriangleAlert
                    className="text-[#f59e0b]"
                    strokeWidth={2.5}
                    style={{ width: s.check, height: s.check }}
                  />
                </div>
              ) : isCurrent ? (
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: s.circle,
                    height: s.circle,
                    backgroundColor: 'rgba(112,125,255,0.09)',
                    border: '1px solid rgba(112,125,255,0.31)',
                  }}
                >
                  <span
                    className="rounded-full bg-[#707dff]"
                    style={{ width: s.dot, height: s.dot }}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: s.circle,
                    height: s.circle,
                    backgroundColor: '#f0f2fa',
                    border: '1px solid #dde0f0',
                  }}
                >
                  <span
                    className="rounded-full bg-[#c4cadf]"
                    style={{ width: s.smallDot, height: s.smallDot }}
                  />
                </div>
              )}
            </div>

            {connectorColor && (
              <div
                className="shrink-0 rounded-full"
                style={{
                  width: s.connector,
                  height: 1.5,
                  backgroundColor: connectorColor,
                }}
              />
            )}
          </div>
        )
      })}

      {tip && (
        <div
          className="fixed z-[60] pointer-events-none"
          style={{
            left: Math.min(Math.max(tip.x, 80), window.innerWidth - 80),
            top: tip.y - 6,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex flex-col items-center">
            <div className="bg-[#12143a] rounded-[8px] px-[10px] py-[7px] shadow-[0px_8px_20px_rgba(18,20,58,0.25)]">
              <p className="font-sans font-bold text-[11px] leading-[15px] text-white whitespace-nowrap">
                {tip.row.label}
              </p>
              <p className="font-sans font-medium text-[10px] leading-[14px] text-[rgba(255,255,255,0.65)] whitespace-nowrap">
                {STATUS_LABEL[tip.row.state]}
              </p>
            </div>
            <div className="size-[8px] -mt-[4px] rotate-45 bg-[#12143a]" />
          </div>
        </div>
      )}
    </div>
  )
}
