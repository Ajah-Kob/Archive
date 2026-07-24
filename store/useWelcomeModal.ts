import { create } from 'zustand'

type WelcomeModalState = {
  activeModal: 'student' | 'faculty' | null
  setActiveModal: (payload: 'student' | 'faculty' | null) => void
}

const initialState = null

export const useWelcomeModal = create<WelcomeModalState>()((set) => ({
  activeModal: initialState,
  setActiveModal: (payload) => set({ activeModal: payload }),
}))
