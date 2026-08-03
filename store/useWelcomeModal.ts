import { create } from 'zustand'

type WelcomeModalState = {
  activeModal: 'student' | 'faculty' | null
  setActiveModal: (payload: 'student' | 'faculty' | null) => void
}

export const useWelcomeModal = create<WelcomeModalState>()((set) => ({
  activeModal: null,
  setActiveModal: (payload) => set({ activeModal: payload }),
}))
