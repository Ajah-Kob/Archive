import { create } from 'zustand'

type JoinArchiveState = {
  activeModal: 'student' | 'faculty' | null
  setActiveModal: (payload: 'student' | 'faculty' | null) => void
}

export const useJoinArchive = create<JoinArchiveState>()((set) => ({
  activeModal: null,
  setActiveModal: (payload) => set({ activeModal: payload }),
}))
