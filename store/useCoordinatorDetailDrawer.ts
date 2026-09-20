import { create } from 'zustand'

type CoordinatorDetailDrawerState = {
  isOpen: boolean
  facultyId: number | null
  open: (facultyId: number) => void
  close: () => void
}

export const useCoordinatorDetailDrawer =
  create<CoordinatorDetailDrawerState>()((set) => ({
    isOpen: false,
    facultyId: null,
    open: (facultyId) => set({ isOpen: true, facultyId }),
    close: () => set({ isOpen: false, facultyId: null }),
  }))
