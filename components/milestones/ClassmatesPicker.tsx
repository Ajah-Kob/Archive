'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Search, Users } from 'lucide-react'
import { getAvailableClassmates } from '@/lib/actions/groups'
import type { Classmate } from '@/types/milestones'
import { getInitials } from '@/lib/helper'

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #707dff 0%, #5565ff 100%)',
  'linear-gradient(135deg, #fe6f6f 0%, #e85555 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #e08800 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
]

interface ClassmatesPickerProps {
  limit: number
  selected: number[]
  onToggle: (id: number) => void
}

export function ClassmatesPicker({
  limit,
  selected,
  onToggle,
}: ClassmatesPickerProps) {
  const { data: session } = useSession()
  const [classmates, setClassmates] = useState<Classmate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const userId = session?.user?.id ? +session.user.id : null
    if (!userId) return
    let cancelled = false
    getAvailableClassmates(userId).then((res) => {
      if (cancelled) return
      setClassmates(res.success ? (res.payload ?? []) : [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return classmates
    return classmates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    )
  }, [classmates, query])

  const remaining = Math.max(0, limit - selected.length)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <p className="font-sans font-bold text-[12.5px] leading-[18.75px] text-[#3c4268] tracking-[0.125px]">
          Invite Members
        </p>
        <p className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
          {selected.length} selected
          {remaining > 0 && ` · ${remaining} available`}
        </p>
      </div>

      <div className="pt-[10px] flex items-center gap-[10px] bg-[#fafbff] border border-[#dddff0] rounded-[9px] px-[13px] py-[9px]">
        <Search className="size-[14px] text-[#9ea8c6] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search classmates…"
          className="flex-1 bg-transparent border-0 outline-none text-[13px] font-medium text-[#12143a] placeholder:text-[rgba(18,20,58,0.5)]"
        />
      </div>

      <div className="pt-[10px] border border-[#eceef8] rounded-[9px] h-[312px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[12.5px] font-medium text-[#9ea8c6]">
              Loading classmates…
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-[8px] px-[20px]">
            <Users className="size-6 text-[#c4cadf]" strokeWidth={1.75} />
            <span className="text-[12.5px] font-medium text-[#9ea8c6] text-center">
              No available classmates found.
            </span>
          </div>
        ) : (
          filtered.map((c, i) => {
            const isSelected = selected.includes(c.id)
            const isDisabled = c.invited || (!isSelected && remaining === 0)
            return (
              <button
                key={c.id}
                type="button"
                disabled={isDisabled && !isSelected}
                onClick={() => onToggle(c.id)}
                className={`w-full flex items-center gap-[12px] px-[14px] py-[10px] border-b border-[#f4f5fc] last:border-b-0 text-left transition-colors ${
                  isDisabled && !isSelected
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[#fafbff] cursor-pointer'
                }`}
              >
                <div
                  className="size-[32px] rounded-full flex items-center justify-center shrink-0 drop-shadow-[0px_2px_3px_rgba(0,0,0,0.12)]"
                  style={{ backgroundImage: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}
                >
                  <span className="text-white text-[11.5px] font-bold tracking-[0.2304px]">
                    {getInitials(c.name)}
                  </span>
                </div>

                <div className="flex-1 min-w-px">
                  <p className="font-sans font-semibold text-[13.5px] leading-[20.25px] text-[#1e2145] truncate">
                    {c.name}
                  </p>
                  <p className="font-sans font-medium text-[11.5px] leading-[17.25px] text-[#9ea8c6] truncate">
                    {c.email}
                  </p>
                </div>

                {c.invited ? (
                  <span className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.18)] rounded-[6px] px-[8px] py-[3px] text-[10.5px] font-semibold text-[#f59e0b] whitespace-nowrap">
                    Invited
                  </span>
                ) : (
                  <div
                    className={`size-[20px] rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#707dff] border-[#707dff]'
                        : 'bg-white border-[#dddff0]'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="size-[11px] text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
