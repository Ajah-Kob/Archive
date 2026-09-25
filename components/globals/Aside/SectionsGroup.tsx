'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { getCoordinatorSections, type MySectionCardData } from '@/lib/actions/sections'
import { useSectionsRefresh } from '@/store/useSectionsRefresh'

const STORAGE_KEY = 'archive-sections-group-collapsed'

async function fetchSections(): Promise<MySectionCardData[]> {
  const res = await getCoordinatorSections()
  return res.success && res.payload ? res.payload : []
}

export function SectionsGroup({
  pathname,
  minimize,
}: {
  pathname: string
  minimize: boolean
}) {
  const version = useSectionsRefresh((state) => state.version)
  const [sections, setSections] = useState<MySectionCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchSections().then((data) => {
      if (controller.signal.aborted) return
      setSections(data)
      setLoading(false)
    })
    return () => controller.abort()
  }, [pathname, version])

  useEffect(() => {
    if (hydrated) return
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // storage unavailable — keep default (expanded)
    }
    setHydrated(true)
  }, [hydrated])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // storage unavailable
      }
      return next
    })
  }

  const hasActive = sections.some((s) => pathname === `/faculty/my-section/${s.id}`)
  const expanded = hasActive || !collapsed

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleCollapsed}
          title={minimize ? 'My Sections' : undefined}
          className={`group relative flex flex-1 items-center h-10 w-full rounded-[10px] pl-[10px] pr-[10px] gap-2 overflow-hidden transition-colors ${
            hasActive
              ? 'bg-[rgba(112,125,255,0.1)]'
              : 'hover:bg-[rgba(112,125,255,0.05)]'
          }`}
        >
          {hasActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] rounded-full bg-[#707dff]" />
          )}
          <span className="flex items-center justify-center w-5 shrink-0">
            <Layers
              size={20}
              className={hasActive ? 'text-[#707dff]' : 'text-[#5a6382]'}
            />
          </span>
          <span
            className={`flex-1 min-w-0 text-[13px] whitespace-nowrap truncate text-left transition-opacity duration-300 ${
              minimize ? 'opacity-0' : 'opacity-100'
            } ${
              hasActive ? 'font-bold text-[#707dff]' : 'font-medium text-[#5a6382]'
            }`}
          >
            My Sections
          </span>
          {!minimize &&
            (expanded ? (
              <ChevronDown size={15} className="text-[#8a93b4] shrink-0" />
            ) : (
              <ChevronRight size={15} className="text-[#8a93b4] shrink-0" />
            ))}
        </button>

      </div>

      {!minimize && expanded && (
        <div className="flex flex-col gap-0.5 pt-1 pl-[15px]">
          {loading ? (
            <>
              <div className="h-8 rounded-[8px] bg-[rgba(112,125,255,0.06)] animate-pulse" />
              <div className="h-8 rounded-[8px] bg-[rgba(112,125,255,0.06)] animate-pulse" />
            </>
          ) : sections.length === 0 ? (
            <p className="px-[10px] py-[7px] font-sans font-medium text-[12px] text-[#9ea8c6]">
              No sections yet
            </p>
          ) : (
            sections.map((s) => (
              <Link
                key={s.id}
                href={`/faculty/my-section/${s.id}?tab=students`}
                aria-current={pathname === `/faculty/my-section/${s.id}` ? 'page' : undefined}
                className={`flex items-center h-8 rounded-[8px] pl-[10px] pr-[10px] text-[13px] whitespace-nowrap truncate transition-colors ${
                  pathname === `/faculty/my-section/${s.id}`
                    ? 'font-bold text-[#707dff] bg-[rgba(112,125,255,0.1)]'
                    : 'font-medium text-[#5a6382] hover:bg-[rgba(112,125,255,0.05)] hover:text-[#707dff]'
                }`}
              >
                {s.name}
              </Link>
            ))
          )}
        </div>
      )}

    </div>
  )
}