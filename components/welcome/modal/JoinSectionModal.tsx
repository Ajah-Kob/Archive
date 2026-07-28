'use client'

import { useState } from 'react'
import { ModalHeader } from './ModalHeader'
import { ModalFooter } from './ModalFooter'
import { joinSection } from '@/lib/actions/sections'
import { TriangleAlert } from 'lucide-react'
import { useWelcomeModal } from '@/store/useWelcomeModal'

export function JoinSectionModal() {
  const setSuccessModal = useWelcomeModal((state) => state.setSuccessModal)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const isBusy = isPending || !code.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('code', code.trim())

    setIsPending(true)
    const res = await joinSection(formData)
    setIsPending(false)

    if (!res.success) {
      setError(res.message)
      return
    }

    setSuccessModal('student')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[420px] p-[29px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col items-start">
        <ModalHeader type="student" />

        <form
          id="join-section-form"
          onSubmit={handleSubmit}
          className="flex flex-col items-start w-full pt-[22px]"
        >
          <div className="pb-[7px]">
            <label className="font-['Plus_Jakarta_Sans', sans-serif] font-bold text-[12.5px] leading-[18.75px] text-[#3c4268] tracking-[0.125px]">
              Invitation Code
            </label>
          </div>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Enter or paste code here"
            className={`w-full h-[42.25px] bg-white border rounded-[9px] px-[15px] py-[11px] text-[13.5px] tracking-[0.27px] font-['Plus_Jakarta_Sans', sans-serif] font-medium outline-none ${
              error
                ? 'border-[rgba(254,111,111,0.5)] text-[#12143a]'
                : 'border-[rgba(214,217,241,0.91)] text-[#12143a]'
            }`}
          />
          {error && (
            <div className="flex gap-[6px] items-start pt-[8px] w-full">
              <TriangleAlert
                size={13}
                className="text-[#fe6f6f] shrink-0 mt-px"
              />
              <p className="font-medium text-[12px] leading-[17.4px] text-[#fe6f6f]">
                {error}
              </p>
            </div>
          )}
        </form>

        <ModalFooter type="student" disabled={isBusy} isPending={isPending} />
      </div>
    </div>
  )
}
