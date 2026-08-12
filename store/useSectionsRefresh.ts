import { create } from 'zustand'

type SectionsRefreshState = {
  version: number
  bump: () => void
}

export const useSectionsRefresh = create<SectionsRefreshState>()((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}))