'use client'

import { useState, useRef, useActionState } from 'react'
import { forgotPassword } from '@/lib/actions/util'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthSubmitButton } from '@/components/ui/AuthSubmitButton'

export default function FormForgotPassword({
  className,
}: {
  className: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  const [state, handleSubmit, isPending] = useActionState(forgotPassword, {
    success: false,
    message: null,
    errors: null,
  })
  const [isFormValid, setIsFormValid] = useState(false)

  function checkFormValidity() {
    const form = formRef.current
    if (!form) return
    const inputs = form.querySelectorAll('input[required]:not([type="hidden"])')
    setIsFormValid(
      Array.from(inputs).every(
        (input) => (input as HTMLInputElement).value.trim() !== ''
      )
    )
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      onInput={checkFormValidity}
      noValidate
      className={`${className} flex flex-col gap-4`}
    >
      {/* Header Section */}
      <div className="text-left flex flex-col gap-1">
        <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-normal">
          Forgot your password?
        </h2>
        <p className="text-gray-500 font-inter text-[13px] non-italic font-medium leading-[20.8px]">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <AuthInput
        label="Email"
        name="email"
        type="email"
        placeholder="johnthomas@email.com"
        error={state?.errors?.email}
        required
      />

      {/* Alert */}
      {state && state.message && (
        <div
          className={`alert ${
            state.success ? 'alert--success' : 'alert--danger'
          }`}
        >
          {state.message}
        </div>
      )}

      <AuthSubmitButton
        pending={isPending}
        label="Submit"
        disabled={!isFormValid}
      />
    </form>
  )
}
