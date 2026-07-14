'use client'

import { useState } from 'react'
import { ModalHeader } from './ModalHeader'
import { InvitationCodeInput } from './InvitationCodeInput'
import { ModalFooter } from './ModalFooter'

interface JoinFacultyModalProps {
  onClose: () => void
}

export function JoinFacultyModal({ onClose }: JoinFacultyModalProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!code.trim()) {
      setError('Please enter an invitation code.')
      return
    }
    // TODO: Validate invitation code with backend
    // For now, placeholder
    console.log('Faculty code submitted:', code)
  }

  function handleCancel() {
    setCode('')
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[420px] p-[29px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col items-start">
        <ModalHeader
          title="Join Faculty"
          description="Enter the invitation code provided by the Program Chair."
          onClose={handleCancel}
        />

        <InvitationCodeInput
          value={code}
          onChange={(v) => {
            setCode(v)
            if (error) setError(null)
          }}
          placeholder="e.g. FACULTY-2025"
          error={error}
        />

        <ModalFooter
          submitLabel="Join Faculty"
          submitGradient="linear-gradient(169.736deg, #707dff 0%, #5565ff 100%)"
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
