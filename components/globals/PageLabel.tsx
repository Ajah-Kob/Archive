'use client'

import { useEffect } from 'react'
import { usePageHeader } from '@/store/usePageHeader'

export function PageLabel({ label }: { label: string }) {
  const setLabel = usePageHeader((state) => state.setLabel)

  useEffect(() => {
    setLabel(label)
    return () => setLabel(null)
  }, [label, setLabel])

  return null
}