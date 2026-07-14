'use client'

import { useState } from 'react'
import { ModalHeader } from './ModalHeader'
import { InvitationCodeInput } from './InvitationCodeInput'
import { ModalFooter } from './ModalFooter'

interface JoinSectionModalProps {
  onClose: () => void
}

export function JoinSectionModal({ onClose }: JoinSectionModalProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!code.trim()) {
      setError('Please enter an invitation code.')
      return
    }
    // TODO: Validate invitation code with backend
    // Refer to workflow/02-section-management.md for the complete student joining process
    console.log('Section code submitted:', code)
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
          title="Join as Student"
          description="Enter the invitation code provided by your Coordinator."
          onClose={handleCancel}
        />

        <InvitationCodeInput
          value={code}
          onChange={(v) => {
            setCode(v)
            if (error) setError(null)
          }}
          placeholder="e.g. BSIS-2025-3B"
          error={error}
        />

        <ModalFooter
          submitLabel="Join Section"
          submitGradient="linear-gradient(169.736deg, #e85e5e 0%, #fe6f6f 100%)"
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
