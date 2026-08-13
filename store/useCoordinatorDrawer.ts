import { create } from 'zustand'

type CoordinatorDrawerState = {
  isOpen: boolean
  open: () => void
  close: () => void
}

const initialState = false

export const useCoordinatorDrawer = create<CoordinatorDrawerState>()((set) => ({
  isOpen: initialState,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
