'use client'

import { useState } from 'react'
import { ModalHeader } from './ModalHeader'
import { InvitationCodeInput } from './InvitationCodeInput'
import { ModalFooter } from './ModalFooter'
import { getFacultyInvitationCode } from '@/lib/actions/invitation-code'

export function JoinFacultyModal() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const res = await getFacultyInvitationCode()
    setCode(res.payload.code)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[420px] p-[29px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col items-start">
        <ModalHeader type="faculty" />

        <InvitationCodeInput
          value={code}
          onChange={(v) => {
            setCode(v)
            if (error) setError(null)
          }}
          placeholder="Type or paste code here"
          error={error}
        />

        <ModalFooter type="faculty" />
      </div>
    </div>
  )
}
