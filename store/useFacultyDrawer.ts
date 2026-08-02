import { create } from 'zustand'

type FacultyDrawerState = {
  isOpen: boolean
  facultyId: number | null
  open: (facultyId: number) => void
  close: () => void
}

export const useFacultyDrawer = create<FacultyDrawerState>()((set) => ({
  isOpen: false,
  facultyId: null,
  open: (facultyId) => set({ isOpen: true, facultyId }),
  close: () => set({ isOpen: false, facultyId: null }),
}))
