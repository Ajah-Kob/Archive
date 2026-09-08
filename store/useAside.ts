import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AsideState = {
  minimize: boolean
  setMinimize: (payload: boolean) => void
  toggleMinimize: () => void
}

const initialState = true

export const useAside = create<AsideState>()(
  persist(
    (set) => ({
      minimize: initialState,
      setMinimize: (payload: boolean) => set({ minimize: payload }),
      toggleMinimize: () => set((state) => ({ minimize: !state.minimize })),
    }),
    {
      name: 'aside-storage',
      partialize: (state) => ({ minimize: state.minimize }),
    },
  ),
)
