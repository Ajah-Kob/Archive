import { create } from 'zustand'

type WelcomeModalState = {
  activeModal: 'student' | 'faculty' | null
  setActiveModal: (payload: 'student' | 'faculty' | null) => void
  successModal: 'student' | 'faculty' | null
  setSuccessModal: (payload: 'student' | 'faculty' | null) => void
}

export const useWelcomeModal = create<WelcomeModalState>()((set) => ({
  activeModal: null,
  setActiveModal: (payload) => set({ activeModal: payload, successModal: null }),
  successModal: null,
  setSuccessModal: (payload) => set({ successModal: payload, activeModal: null }),
}))
