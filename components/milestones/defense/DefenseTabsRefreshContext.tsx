'use client'

import { createContext, use, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

interface DefenseTabsRefreshContextValue {
  isRefreshing: boolean
  triggerRefresh: () => void
}

const DefenseTabsRefreshContext = createContext<DefenseTabsRefreshContextValue | null>(null)

export function useDefenseTabsRefresh(): DefenseTabsRefreshContextValue {
  const ctx = use(DefenseTabsRefreshContext)
  if (!ctx) {
    return { isRefreshing: false, triggerRefresh: () => {} }
  }
  return ctx
}

export function DefenseTabsRefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true)
    router.refresh()
    // Fallback: clear after 5s if data doesn't change
    setTimeout(() => setIsRefreshing(false), 5000)
  }, [router])

  return (
    <DefenseTabsRefreshContext.Provider value={{ isRefreshing, triggerRefresh }}>
      {children}
    </DefenseTabsRefreshContext.Provider>
  )
}
