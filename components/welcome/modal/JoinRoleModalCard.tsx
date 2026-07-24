'use client'

import { useWelcomeModal } from '@/store/useWelcomeModal'
import { ModalFooter } from './ModalFooter'
import { ModalHeader } from './ModalHeader'
import { InvitationCodeInput } from './InvitationCodeInput'

export function JoinOptionCard({ role }: { role: 'student' | 'faculty' }) {
  const activeModal = useWelcomeModal((state) => state.activeModal)
  const setActiveModal = useWelcomeModal((state) => state.setActiveModal)

  return (
    <div>
      <ModalHeader role={activeModal} />
      <InvitationCodeInput />
      <ModalFooter role={activeModal} />
    </div>
  )
}
