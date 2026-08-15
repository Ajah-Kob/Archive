import { create } from 'zustand'

type PageHeaderState = {
  label: string | null
  setLabel: (payload: string | null) => void
}

export const usePageHeader = create<PageHeaderState>()((set) => ({
  label: null,
  setLabel: (payload: string | null) => set({ label: payload }),
}))